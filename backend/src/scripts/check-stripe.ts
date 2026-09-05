// Verifies the Stripe setup without charging anything or creating anything.
//
//   npm run stripe:check
//
// It answers four questions:
//   1. Is the configuration present and shaped like real Stripe values?
//   2. Does the secret key actually work against Stripe's API?
//   3. Are we definitely in TEST mode?
//   4. Is the configured price a recurring MONTHLY price, as the assignment
//      requires? (A one-off price would fail only later, at Checkout.)
//
// A development tool, not part of the running application.

import { env } from "../config/env";
import { getStripe, isStripeConfigured, isWebhookConfigured } from "../stripe";

const tick = (ok: boolean) => (ok ? "PASS" : "FAIL");

// Shows enough of a value to recognise it, never enough to use it.
function masked(value: string | null): string {
  if (value === null) return "(not set)";
  if (value.length <= 12) return `${value.slice(0, 4)}…`;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

async function main() {
  console.log("Stripe configuration check\n");

  console.log("1. Configuration present");
  console.log(`   STRIPE_SECRET_KEY     ${masked(env.stripe.secretKey)}`);
  console.log(`   STRIPE_PRICE_ID       ${env.stripe.priceId ?? "(not set)"}`);
  console.log(`   STRIPE_WEBHOOK_SECRET ${masked(env.stripe.webhookSecret)}`);
  console.log(`   -> checkout ready:    ${tick(isStripeConfigured)}`);
  console.log(`   -> webhooks ready:    ${tick(isWebhookConfigured)}`);

  if (!isStripeConfigured) {
    console.log("\nStripe is not configured yet. Add the values above to backend/.env:");
    console.log("  * secret key:  https://dashboard.stripe.com/test/apikeys");
    console.log("  * price id:    https://dashboard.stripe.com/test/products");
    console.log("\nThe rest of the application runs fine without them.");
    process.exit(1);
  }

  const stripe = getStripe();

  console.log("\n2. Does the key work, and are we in test mode?");
  // One call proves two things: the key is accepted (otherwise this throws),
  // and `livemode` is Stripe's OWN answer about which universe we are in -
  // authoritative, rather than inferred from the shape of our key.
  const balance = await stripe.balance.retrieve();
  const isTestMode = balance.livemode === false;
  console.log(`   -> key accepted:      PASS`);
  console.log(`   livemode:             ${balance.livemode}`);
  console.log(`   -> TEST mode:         ${tick(isTestMode)}`);

  console.log("\n3. Is the price a recurring monthly subscription price?");
  const price = await stripe.prices.retrieve(env.stripe.priceId!, { expand: ["product"] });

  const isRecurring = price.type === "recurring";
  const isMonthly = price.recurring?.interval === "month" && price.recurring?.interval_count === 1;
  const isActive = price.active === true;
  const priceLivemode = price.livemode === true;

  const productName =
    typeof price.product === "object" && "name" in price.product
      ? price.product.name
      : String(price.product);

  const amount =
    price.unit_amount === null
      ? "(no fixed amount)"
      : `${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`;

  console.log(`   product:              ${productName}`);
  console.log(`   amount:               ${amount}`);
  console.log(`   interval:             ${price.recurring ? `every ${price.recurring.interval_count} ${price.recurring.interval}` : "one-off"}`);
  console.log(`   -> recurring:         ${tick(isRecurring)}`);
  console.log(`   -> monthly:           ${tick(isMonthly)}`);
  console.log(`   -> active:            ${tick(isActive)}`);
  console.log(`   -> test-mode price:   ${tick(!priceLivemode)}`);

  const allPassed = isTestMode && isRecurring && isMonthly && isActive && !priceLivemode;

  console.log(`\n${allPassed ? "All checks passed." : "Some checks FAILED - see above."}`);

  if (!isMonthly) {
    console.log(
      "The assignment requires a MONTHLY subscription. In the Stripe dashboard, " +
        "edit the product's price to bill every 1 month."
    );
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  // Stripe's own errors are already readable; show the message rather than a
  // stack trace full of SDK internals.
  console.error(`\nStripe check failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
