// The Stripe client, and the one place that decides whether Stripe is usable.
//
// Mirrors src/prisma.ts: one shared client for the whole backend, created once.
//
// Everything in this file runs on the SERVER only. The secret key must never
// reach the browser - it can create charges, read customer data and issue
// refunds. The frontend never sees it; it only ever calls our own endpoints.

import Stripe from "stripe";
import { env } from "./config/env";
import { serviceUnavailable } from "./errors/AppError";

// Built only when configuration is present.
//
// Creating a Stripe client with a null key would fail at import time and stop
// the whole server from starting - which would mean product search, which needs
// no Stripe at all, could not run without a Stripe account.
const client: Stripe | null = env.stripe.secretKey
  ? new Stripe(env.stripe.secretKey)
  : null;

// Whether a subscription can actually be started right now.
export const isStripeConfigured = env.stripe.isConfigured;

// Whether we are able to verify incoming webhooks. Separate from the above
// because the two are set up at different moments: you can create Checkout
// sessions before you have ever run `stripe listen`.
export const isWebhookConfigured = env.stripe.webhookSecret !== null;

// Returns the client, or explains precisely what is missing.
//
// Every Stripe-dependent code path goes through here, so a half-configured
// installation produces one clear message naming the variable to set - rather
// than a null-pointer error deep inside a route handler.
export function getStripe(): Stripe {
  if (client === null) {
    throw serviceUnavailable(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in backend/.env " +
        "(get a test key from https://dashboard.stripe.com/test/apikeys).",
      "STRIPE_NOT_CONFIGURED"
    );
  }

  return client;
}

// The monthly price the demo user subscribes to.
export function getStripePriceId(): string {
  if (env.stripe.priceId === null) {
    throw serviceUnavailable(
      "Stripe is not configured. Set STRIPE_PRICE_ID in backend/.env " +
        "(the id of a recurring monthly price, starting with price_).",
      "STRIPE_NOT_CONFIGURED"
    );
  }

  return env.stripe.priceId;
}

// The secret Stripe signs webhook payloads with. Used in Milestone 15 to prove
// an incoming request really came from Stripe.
export function getWebhookSecret(): string {
  if (env.stripe.webhookSecret === null) {
    throw serviceUnavailable(
      "Stripe webhooks are not configured. Set STRIPE_WEBHOOK_SECRET in backend/.env " +
        '(shown when you run "stripe listen --forward-to localhost:4000/stripe/webhook").',
      "STRIPE_WEBHOOK_NOT_CONFIGURED"
    );
  }

  return env.stripe.webhookSecret;
}

// A safe summary for diagnostics - see GET /health.
//
// Note what it reports and what it does not: whether things are set, never the
// values. A health endpoint that echoed a secret key would be a spectacular way
// to leak one.
export function describeStripeConfig() {
  return {
    configured: isStripeConfigured,
    webhookConfigured: isWebhookConfigured,
    // Only ever "test": env.ts refuses to start with a live key.
    mode: client === null ? null : ("test" as const),
  };
}
