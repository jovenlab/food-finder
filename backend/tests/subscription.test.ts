// Tests for the rule that decides whether a subscription is live right now.
//
// This is the most security-sensitive logic in the project: it is what stands
// between an unpaid visitor and the data we are paid to protect. It is also the
// easiest thing in the project to test, because `isSubscriptionLive` is a PURE
// function - it takes a subscription and a date, returns true or false, and
// touches no database and no network.
//
// That is not an accident. It was written as a pure function in Milestone 12
// specifically so it could be tested like this.

import { describe, expect, it } from "vitest";
import { isSubscriptionLive } from "../src/services/subscription.service";

const DAY = 24 * 60 * 60 * 1000;

// A fixed "now" so these tests give the same answer in a year's time. Tests that
// depend on the real clock eventually fail for reasons nobody can reproduce.
const NOW = new Date("2026-06-15T12:00:00.000Z");
const IN_30_DAYS = new Date(NOW.getTime() + 30 * DAY);
const YESTERDAY = new Date(NOW.getTime() - DAY);

// Builds a subscription row, with only the fields we care about overridden.
function subscription(overrides: Partial<Parameters<typeof isSubscriptionLive>[0]> = {}) {
  return {
    id: 1,
    stripeSubscriptionId: "sub_test",
    status: "active",
    currentPeriodEnd: IN_30_DAYS,
    cancelAtPeriodEnd: false,
    userId: 1,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("isSubscriptionLive", () => {
  it("says no when there is no subscription at all", () => {
    // Someone who has never subscribed. The commonest case, and it must not
    // throw on the null.
    expect(isSubscriptionLive(null, NOW)).toBe(false);
  });

  it("says yes for an active subscription with time left", () => {
    expect(isSubscriptionLive(subscription(), NOW)).toBe(true);
  });

  it("says yes for a trial", () => {
    // Stripe treats a trial as a live subscription, and so do we - the customer
    // is entitled to the product during it.
    expect(isSubscriptionLive(subscription({ status: "trialing" }), NOW)).toBe(true);
  });

  it("KEEPS access after the user cancels, until the paid period ends", () => {
    // The customer clicked cancel but already paid for this month. Cutting them
    // off immediately would be taking money for nothing.
    const cancelled = subscription({ cancelAtPeriodEnd: true, currentPeriodEnd: IN_30_DAYS });

    expect(isSubscriptionLive(cancelled, NOW)).toBe(true);
  });

  it("DENIES access once the period has passed, even if the status still says active", () => {
    // The safety net. If Stripe's cancellation webhook never reaches us, our
    // stored status stays "active" forever. Without this check that one lost
    // request would grant free access indefinitely.
    const expired = subscription({ status: "active", currentPeriodEnd: YESTERDAY });

    expect(isSubscriptionLive(expired, NOW)).toBe(false);
  });

  it("denies access while a payment is failing (past_due)", () => {
    // Stripe is retrying the card. When payment is uncertain, withholding is the
    // safe default.
    expect(isSubscriptionLive(subscription({ status: "past_due" }), NOW)).toBe(false);
  });

  // Every remaining Stripe status means "not currently paid for".
  it.each(["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"])(
    "denies access for status %s",
    (status) => {
      expect(isSubscriptionLive(subscription({ status }), NOW)).toBe(false);
    }
  );

  it("allows an active subscription with no recorded period end", () => {
    // Open-ended in our records. The status is the only thing we can go on, and
    // it says active.
    expect(isSubscriptionLive(subscription({ currentPeriodEnd: null }), NOW)).toBe(true);
  });

  it("changes its answer as time passes", () => {
    // The same subscription, asked about twice. This is why `now` is a parameter:
    // we can ask "what about next month?" without waiting a month.
    const sub = subscription({ currentPeriodEnd: IN_30_DAYS });

    expect(isSubscriptionLive(sub, NOW)).toBe(true);
    expect(isSubscriptionLive(sub, new Date(NOW.getTime() + 31 * DAY))).toBe(false);
  });
});
