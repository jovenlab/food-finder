// Turning Stripe events into rows in our Subscription table.
//
// This is what finally closes the loop: Stripe is the source of truth about
// subscriptions, and these handlers keep our local mirror in step so that
// access.service.ts can answer "may this user see nutrition?" from one fast
// local query instead of an API call on every request.
//
// Everything here must be safe to run TWICE. Stripe retries a webhook until it
// receives a 2xx, and it can deliver the same event more than once even after
// success. Every write below is an upsert keyed on Stripe's own id, so a repeat
// changes nothing.

import type Stripe from "stripe";
import { prisma } from "../prisma";
import { getStripe } from "../stripe";

// Reads when the currently paid-for period ends.
//
// IMPORTANT: this is NOT `subscription.current_period_end`. Stripe moved period
// boundaries off the Subscription and onto its items, so that a subscription
// with several items can have different billing periods per item. Reading the
// old location silently yields `undefined`, which would store null here - and
// null disables the "has this expired?" safety net in subscription.service.ts.
//
// We have exactly one item (the monthly price), so its period is the
// subscription's period.
function readCurrentPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const firstItem = subscription.items?.data?.[0];
  const epochSeconds = firstItem?.current_period_end;

  // Stripe sends times as Unix seconds; JavaScript wants milliseconds.
  return typeof epochSeconds === "number" ? new Date(epochSeconds * 1000) : null;
}

// Works out which of OUR users a Stripe subscription belongs to.
//
// Two routes, because either one can be missing depending on how the
// subscription was created (our Checkout flow, or by hand in the dashboard).
async function resolveUserId(subscription: Stripe.Subscription): Promise<number | null> {
  // 1. The id we attached in checkout.service.ts. Most reliable.
  const fromMetadata = Number(subscription.metadata?.["appUserId"]);

  if (Number.isInteger(fromMetadata) && fromMetadata > 0) {
    const user = await prisma.user.findUnique({ where: { id: fromMetadata } });
    if (user !== null) return user.id;
  }

  // 2. Otherwise match on the Stripe customer we already stored.
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (customerId) {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
    });
    if (user !== null) return user.id;
  }

  return null;
}

// Writes (or rewrites) one subscription row from Stripe's version of the truth.
async function saveSubscription(subscription: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserId(subscription);

  if (userId === null) {
    // Not an error. A Stripe account can have subscriptions this application
    // knows nothing about - created by hand, or by another integration. Ignoring
    // them is correct; retrying would never help.
    console.warn(
      `Webhook: subscription ${subscription.id} does not belong to any known user - ignoring.`
    );
    return;
  }

  const data = {
    status: subscription.status,
    currentPeriodEnd: readCurrentPeriodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    userId,
  };

  // Keyed on Stripe's subscription id, which is why replaying an event is
  // harmless: the second write produces exactly the same row.
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: { stripeSubscriptionId: subscription.id, ...data },
    update: data,
  });

  console.log(
    `Webhook: subscription ${subscription.id} -> status=${data.status}, ` +
      `periodEnd=${data.currentPeriodEnd?.toISOString() ?? "none"}, ` +
      `cancelAtPeriodEnd=${data.cancelAtPeriodEnd}, userId=${userId}`
  );
}

// A Checkout session finished. The subscription now exists in Stripe, so fetch
// it and store it.
//
// We could not have stored it earlier: it did not exist when we created the
// session, only when the customer actually paid.
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // Only subscription checkouts concern us.
  if (session.mode !== "subscription") return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    console.warn(`Webhook: checkout session ${session.id} has no subscription - ignoring.`);
    return;
  }

  // The event payload carries only the id, so ask Stripe for the full object.
  // Asking Stripe rather than trusting the payload also means we always store
  // the CURRENT state, even if this event arrives late.
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);

  await saveSubscription(subscription);
}

// The events we act on. Anything else is acknowledged and ignored.
//
// Note that subscription.deleted needs no special case: Stripe sets the status
// to "canceled" on the object it sends, and our access rule already refuses
// anything that is not active or trialing.
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await saveSubscription(event.data.object);
      break;

    default:
      // Stripe sends many event types and will send more in future. Ignoring
      // the rest quietly - rather than erroring - keeps the endpoint stable.
      console.log(`Webhook: ignoring event type ${event.type}`);
  }
}
