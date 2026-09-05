// Starting a subscription through Stripe Checkout.
//
// Checkout is a payment page HOSTED BY STRIPE. We do not build a card form, and
// card details never reach our server - which keeps us entirely outside PCI
// compliance scope. Our job is only to describe what the user is buying and hand
// them a URL.
//
// What this file does NOT do is grant access. Creating a session means "the user
// is about to try to pay", nothing more. Access is granted in Milestone 15, when
// Stripe tells our server the subscription actually exists.

import { env } from "../config/env";
import { prisma } from "../prisma";
import { getStripe, getStripePriceId } from "../stripe";
import { conflict, badGateway } from "../errors/AppError";
import { requireDemoUser } from "./user.service";
import { getSubscriptionState } from "./subscription.service";
import type { User } from "../generated/prisma/client";

// Finds or creates the Stripe Customer that represents our demo user.
//
// A Customer is Stripe's record of someone who might pay us. We keep its id in
// User.stripeCustomerId so that a second subscription attaches to the same
// person rather than creating a duplicate.
export async function ensureStripeCustomer(user: User): Promise<string> {
  const stripe = getStripe();

  if (user.stripeCustomerId !== null) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId);

      // A customer deleted in the Stripe dashboard still resolves, but comes
      // back flagged. Reusing it would fail later at Checkout with a confusing
      // error, so we fall through and make a new one.
      if (!existing.deleted) return existing.id;
    } catch {
      // The id no longer exists at all - common in test mode, where test data
      // gets wiped. Fall through and create a fresh customer.
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    // Our own id, stored on Stripe's copy. This is what lets a webhook in
    // Milestone 15 work out which of OUR users an event belongs to.
    metadata: { appUserId: String(user.id) },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export type CheckoutSession = {
  url: string;
  sessionId: string;
};

export async function createCheckoutSession(): Promise<CheckoutSession> {
  const user = await requireDemoUser();

  // Refuse to sell the same thing twice.
  //
  // Without this, clicking Subscribe while already subscribed would create a
  // second live subscription and charge the customer twice a month. The check
  // belongs on the SERVER: hiding the button in React stops an honest mistake,
  // not a direct call to this endpoint.
  const state = await getSubscriptionState(user.id);

  if (state.isLive) {
    throw conflict(
      "This account already has an active subscription.",
      "ALREADY_SUBSCRIBED"
    );
  }

  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(user);

  const session = await stripe.checkout.sessions.create({
    // "subscription" (not "payment") is what makes this a recurring charge.
    // The monthly interval itself lives on the Price, configured in Stripe.
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getStripePriceId(), quantity: 1 }],

    // Where Stripe sends the browser afterwards.
    //
    // {CHECKOUT_SESSION_ID} is a placeholder Stripe substitutes for the real id.
    // We pass it back so the interface can tell a genuine return from someone
    // simply typing the success URL - though note that even a real session id
    // is NOT proof of payment. Only the webhook is.
    success_url: `${env.frontendOrigin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.frontendOrigin}/?checkout=cancelled`,

    // Two more places to record who this is, both readable from webhook events.
    client_reference_id: String(user.id),
    subscription_data: {
      metadata: { appUserId: String(user.id) },
    },
  });

  // Stripe types `url` as nullable because it is absent for some session types.
  // For a hosted Checkout session it is always present, so an absence here means
  // something is genuinely wrong rather than being a case to handle gracefully.
  if (session.url === null) {
    throw badGateway(
      "Stripe created a Checkout session without a URL.",
      "STRIPE_NO_CHECKOUT_URL"
    );
  }

  return { url: session.url, sessionId: session.id };
}
