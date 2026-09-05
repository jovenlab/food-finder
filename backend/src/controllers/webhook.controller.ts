import type { Request, Response } from "express";
import type Stripe from "stripe";
import { getStripe, getWebhookSecret, isWebhookConfigured } from "../stripe";
import { handleStripeEvent } from "../services/webhook.service";

// The endpoint Stripe calls when something happens.
//
// This is the only route in the application that a stranger can reach with a
// request that CHANGES data - so it is the one place where verifying the caller
// actually matters.
//
// Without signature verification this URL would be a free-subscription button:
// anyone could POST {"type":"customer.subscription.created", ...} and grant
// themselves access. Stripe signs every request with a shared secret; we check
// that signature before believing a single field.
//
// The status codes here are instructions to Stripe:
//   2xx  - understood, do not send again
//   4xx  - malformed or unverifiable, do not retry (retrying cannot help)
//   5xx  - we failed to process it, PLEASE retry
export async function stripeWebhookHandler(req: Request, res: Response) {
  if (!isWebhookConfigured) {
    console.error("Webhook received but STRIPE_WEBHOOK_SECRET is not set - rejecting.");
    res.status(503).json({
      error: {
        code: "STRIPE_WEBHOOK_NOT_CONFIGURED",
        message: "Webhooks are not configured on this server.",
      },
    });
    return;
  }

  const signature = req.headers["stripe-signature"];

  if (typeof signature !== "string") {
    res.status(400).json({
      error: { code: "MISSING_SIGNATURE", message: "Missing stripe-signature header." },
    });
    return;
  }

  let event: Stripe.Event;

  try {
    // req.body must be the RAW bytes Stripe signed. app.ts registers
    // express.raw() for this path BEFORE express.json(), because parsing the
    // JSON and re-serialising it produces different bytes - even a change in key
    // order or whitespace breaks the signature.
    //
    // constructEvent also rejects old timestamps, which stops someone replaying
    // a genuine, correctly-signed request captured earlier.
    event = getStripe().webhooks.constructEvent(
      req.body,
      signature,
      getWebhookSecret()
    );
  } catch (error) {
    // Either not from Stripe, or tampered with, or too old. Never retry-able,
    // so 400 rather than 500.
    const reason = error instanceof Error ? error.message : "unknown";
    console.error(`Webhook signature verification FAILED: ${reason}`);

    res.status(400).json({
      error: { code: "INVALID_SIGNATURE", message: "Signature verification failed." },
    });
    return;
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    // Something went wrong on our side - most likely the database. Answering 5xx
    // asks Stripe to deliver this event again later, which is exactly what we
    // want: the payment is real and our records are behind.
    console.error(`Webhook: failed to process ${event.type} (${event.id}):`, error);

    res.status(500).json({
      error: { code: "WEBHOOK_PROCESSING_FAILED", message: "Could not process event." },
    });
    return;
  }

  // Acknowledge. Note we do NOT wait for anything slow before replying: Stripe
  // times out webhook deliveries, and a timeout looks like a failure and
  // triggers a retry.
  res.json({ received: true, type: event.type });
}
