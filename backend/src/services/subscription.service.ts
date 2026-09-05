// What Stripe says about the demo user's subscription.
//
// This layer answers ONE question: "is there a live subscription right now?"
// It does not decide what a subscription lets you do - that is access.service.ts.
//
// Stripe is the source of truth. The `Subscription` table is a local mirror kept
// up to date by webhooks (Milestone 15). We read the mirror rather than calling
// Stripe on every request, because that would add a network round trip - and a
// second point of failure - to every single product search.

import { prisma } from "../prisma";
import type { Subscription } from "../generated/prisma/client";

// The Stripe statuses that mean "this subscription is live right now".
//
// Stripe's full set is: active, trialing, past_due, unpaid, canceled,
// incomplete, incomplete_expired, paused. Only these two mean the customer is
// currently entitled to the thing they are paying for.
//
//   trialing  - Stripe treats a trial as a live subscription, and so do we.
//   past_due  - payment failed and Stripe is retrying. Deliberately NOT granted:
//               the safe default when payment is uncertain is to withhold.
const LIVE_STATUSES = new Set(["active", "trialing"]);

// Is this particular subscription row live at this moment?
//
// Exported and pure - it takes everything it needs as arguments and touches no
// database - which makes it directly unit-testable in Milestone 18. `now` is a
// parameter for the same reason: a test can ask "what about next month?" without
// waiting for next month.
export function isSubscriptionLive(
  subscription: Subscription | null,
  now: Date = new Date()
): boolean {
  if (subscription === null) return false;

  if (!LIVE_STATUSES.has(subscription.status)) return false;

  // A safety net against a webhook we never received.
  //
  // If Stripe told us when the paid period ends and that moment has passed, the
  // subscription is over regardless of what `status` still says. Without this,
  // one missed "subscription.deleted" webhook would grant access forever.
  if (subscription.currentPeriodEnd !== null && subscription.currentPeriodEnd <= now) {
    return false;
  }

  // Note what does NOT appear here: cancelAtPeriodEnd.
  //
  // A customer who cancels keeps access until the period they already paid for
  // runs out. Stripe keeps the status "active" until then, and so do we. Cutting
  // access off the moment someone clicks cancel would be taking money for
  // nothing.
  return true;
}

export type SubscriptionState = {
  // The subscription we based the decision on, if any.
  subscription: Subscription | null;
  // Whether that subscription is live right now.
  isLive: boolean;
};

// Works out the demo user's current subscription state.
//
// A user can accumulate several rows over time: cancelling and subscribing again
// creates a brand-new subscription object in Stripe, with a new id, so we insert
// a new row rather than editing the old one.
//
// We grant access if ANY row is live, rather than only looking at the newest.
// Stripe webhooks can arrive out of order, so "newest row we happened to insert"
// is not reliably "current subscription". A genuinely live subscription should
// not be overruled by a stale cancelled one that happens to have been written
// later - and the expiry check above stops a stale "active" row granting access
// forever.
export async function getSubscriptionState(userId: number): Promise<SubscriptionState> {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const live = subscriptions.find((subscription) => isSubscriptionLive(subscription));

  return {
    // Show the live one if there is one; otherwise the most recent, so the
    // interface can say "your subscription was cancelled" rather than nothing.
    subscription: live ?? subscriptions[0] ?? null,
    isLive: live !== undefined,
  };
}
