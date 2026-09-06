// Tests for the Stripe webhook endpoint.
//
// Two things are being proved here:
//
//   1. SECURITY - an unsigned, wrongly-signed, tampered or stale request is
//      refused. This endpoint is publicly reachable, so without verification it
//      would be a free-subscription button.
//
//   2. CORRECTNESS - a genuine event updates our stored subscription, and
//      replaying it changes nothing.
//
// The signatures are REAL: `stripe.webhooks.generateTestHeaderString` signs
// exactly as Stripe does, so this exercises the true verification path rather
// than a mock of it.
//
// The database is replaced with a spy, so we can assert on what WOULD have been
// written without needing MySQL running.

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import Stripe from "stripe";
// Vitest hoists the vi.mock call below above every import, so the mock is
// already in place by the time this module is loaded.
import { createApp } from "../src/app";

// The Stripe settings must be in place BEFORE any module reads them.
//
// config/env.ts reads process.env once, at import time. Plain top-level
// assignments here would run too late - the app module is imported above, so it
// would have already captured the real whsec_ from .env and every signature in
// this file would be rejected. (That is exactly what happened when these
// assignments were not hoisted.)
//
// vi.hoisted runs its callback before any import in the file, which is the whole
// point of it.
const WEBHOOK_SECRET = vi.hoisted(() => {
  const secret = "whsec_test_secret_used_only_by_this_test_file";

  process.env["STRIPE_SECRET_KEY"] ??= "sk_test_dummy_key_for_tests";
  process.env["STRIPE_PRICE_ID"] ??= "price_dummy_for_tests";
  // Forced, not defaulted: a real secret in .env must not leak into the tests.
  process.env["STRIPE_WEBHOOK_SECRET"] = secret;

  return secret;
});

// A stand-in for the Subscription table.
// The upsert spy declares its argument so that `db.upsert.mock.calls[0][0]`
// is typed. Without a declared parameter TypeScript infers an empty argument
// tuple and rejects reading index 0.
type SubscriptionFields = {
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  userId: number;
};

type UpsertArgs = {
  where: { stripeSubscriptionId: string };
  create: SubscriptionFields & { stripeSubscriptionId: string };
  update: SubscriptionFields;
};

const db = vi.hoisted(() => ({
  upsert: vi.fn(async (_args: unknown) => ({})),
  findUser: vi.fn(async () => ({ id: 1 }) as { id: number } | null),
}));

vi.mock("../src/prisma", () => ({
  prisma: {
    subscription: { upsert: db.upsert },
    user: { findUnique: db.findUser },
  },
}));

const realFetch = globalThis.fetch;
const stripe = new Stripe("sk_test_dummy_key_for_tests");

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp();
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  db.upsert.mockClear();
  db.findUser.mockClear();
});

const DAY = 86400;
const nowSec = () => Math.floor(Date.now() / 1000);

// A subscription event shaped exactly as Stripe sends it - including the detail
// that `current_period_end` lives on the ITEMS, not on the subscription.
function subscriptionEvent(type: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `evt_${Math.random().toString(36).slice(2, 12)}`,
    object: "event",
    type,
    created: nowSec(),
    data: {
      object: {
        id: "sub_TEST123",
        object: "subscription",
        customer: "cus_TEST123",
        status: "active",
        cancel_at_period_end: false,
        metadata: { appUserId: "1" },
        items: {
          object: "list",
          data: [
            {
              id: "si_TEST",
              object: "subscription_item",
              current_period_end: nowSec() + 30 * DAY,
            },
          ],
        },
        ...overrides,
      },
    },
  };
}

// Delivers an event. By default it is signed correctly; tests override that.
async function deliver(
  payloadObject: unknown,
  options: { signature?: string | null; secret?: string; timestamp?: number } = {}
) {
  const payload = JSON.stringify(payloadObject);

  const signature =
    options.signature !== undefined
      ? options.signature
      : stripe.webhooks.generateTestHeaderString({
          payload,
          secret: options.secret ?? WEBHOOK_SECRET,
          ...(options.timestamp !== undefined ? { timestamp: options.timestamp } : {}),
        });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature !== null) headers["stripe-signature"] = signature;

  const response = await realFetch(`${baseUrl}/stripe/webhook`, {
    method: "POST",
    headers,
    body: payload,
  });

  return { status: response.status, body: await response.json() };
}

describe("webhook signature verification", () => {
  it("accepts a correctly signed event", async () => {
    const { status } = await deliver(subscriptionEvent("customer.subscription.created"));

    expect(status).toBe(200);
    expect(db.upsert).toHaveBeenCalledTimes(1);
  });

  it("refuses a request with no signature at all", async () => {
    const { status, body } = await deliver(
      subscriptionEvent("customer.subscription.created"),
      { signature: null }
    );

    expect(status).toBe(400);
    expect(body.error.code).toBe("MISSING_SIGNATURE");
    // The decisive assertion: nothing was written.
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it("refuses a made-up signature", async () => {
    const { status, body } = await deliver(
      subscriptionEvent("customer.subscription.created"),
      { signature: "t=123,v1=deadbeef" }
    );

    expect(status).toBe(400);
    expect(body.error.code).toBe("INVALID_SIGNATURE");
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it("refuses a signature made with a different secret", async () => {
    const { status } = await deliver(subscriptionEvent("customer.subscription.created"), {
      secret: "whsec_someone_elses_secret",
    });

    expect(status).toBe(400);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it("refuses a body that was edited after being signed", async () => {
    const original = subscriptionEvent("customer.subscription.updated");
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: JSON.stringify(original),
      secret: WEBHOOK_SECRET,
    });

    // An attacker intercepts a real event and rewrites it in their favour.
    const tampered = subscriptionEvent("customer.subscription.updated", {
      metadata: { appUserId: "999" },
    });

    const { status } = await deliver(tampered, { signature });

    expect(status).toBe(400);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it("refuses a replay of a genuine request captured earlier", async () => {
    // Correctly signed with the right secret - but an hour old. Stripe's
    // verification includes the timestamp precisely to stop this.
    const { status } = await deliver(subscriptionEvent("customer.subscription.created"), {
      timestamp: nowSec() - 3600,
    });

    expect(status).toBe(400);
    expect(db.upsert).not.toHaveBeenCalled();
  });
});

describe("webhook updates our subscription state", () => {
  it("stores the status and the period end from the subscription's ITEMS", async () => {
    // The period end is deliberately checked here. Stripe moved it off the
    // subscription and onto its items; reading the old place would silently
    // store null and disable the expiry safety net.
    await deliver(subscriptionEvent("customer.subscription.created"));

    const call = db.upsert.mock.calls[0]![0] as UpsertArgs;

    expect(call.where).toEqual({ stripeSubscriptionId: "sub_TEST123" });
    expect(call.create.status).toBe("active");
    expect(call.create.userId).toBe(1);
    // Narrowed rather than asserted away: if this ever becomes null, the expiry
    // safety net silently stops working, so the test must fail loudly here.
    const periodEnd = call.create.currentPeriodEnd;

    expect(periodEnd).toBeInstanceOf(Date);
    expect(periodEnd!.getTime()).toBeGreaterThan(Date.now());
  });

  it("records a cancellation that takes effect at the period end", async () => {
    await deliver(
      subscriptionEvent("customer.subscription.updated", { cancel_at_period_end: true })
    );

    const call = db.upsert.mock.calls[0]![0] as UpsertArgs;

    expect(call.update.cancelAtPeriodEnd).toBe(true);
    // Still "active": the customer keeps access until the period runs out.
    expect(call.update.status).toBe("active");
  });

  it("records a cancelled subscription", async () => {
    await deliver(
      subscriptionEvent("customer.subscription.deleted", { status: "canceled" })
    );

    expect((db.upsert.mock.calls[0]![0] as UpsertArgs).update.status).toBe("canceled");
  });

  it("is idempotent - replaying an event writes the same row, not a second one", async () => {
    // Stripe retries until it gets a 2xx and can deliver the same event twice.
    // An INSERT would duplicate; an upsert keyed on Stripe's id cannot.
    const event = subscriptionEvent("customer.subscription.created");

    await deliver(event);
    await deliver(event);

    expect(db.upsert).toHaveBeenCalledTimes(2);
    expect(db.upsert.mock.calls[0]![0]).toEqual(db.upsert.mock.calls[1]![0]);
  });

  it("ignores an event about a subscription belonging to nobody we know", async () => {
    // A Stripe account can hold subscriptions this app knows nothing about.
    db.findUser.mockResolvedValueOnce(null);

    const { status } = await deliver(
      subscriptionEvent("customer.subscription.created", { metadata: {} })
    );

    // 200, because retrying would never help - but nothing is written.
    expect(status).toBe(200);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it("acknowledges event types we do not act on", async () => {
    const { status } = await deliver({
      id: "evt_other",
      object: "event",
      type: "invoice.payment_succeeded",
      created: nowSec(),
      data: { object: { id: "in_1", object: "invoice" } },
    });

    expect(status).toBe(200);
    expect(db.upsert).not.toHaveBeenCalled();
  });
});
