// The single place where the application reads its configuration.
//
// Two reasons this file exists:
//
//   1. Every environment variable is read here and nowhere else, so you can see
//      the application's complete configuration at a glance.
//   2. Missing configuration fails immediately at startup with a clear message,
//      instead of causing a confusing crash deep inside a request an hour later.
//
// "Environment variable" = a setting that lives outside the code, in the .env
// file. Passwords and API keys belong here so they never enter version control.

import "dotenv/config";

// Required: the application cannot work without it, so refuse to start.
function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy backend/.env.example to backend/.env and fill it in.`
    );
  }

  return value;
}

// Optional: a sensible default is good enough for local development.
function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a positive number, got "${raw}".`);
  }
  return parsed;
}

// Optional: absent is fine, but a present value must look right.
function optionalEnvOrNull(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : null;
}

// ---------------------------------------------------------------------------
// Stripe configuration.
//
// Deliberately OPTIONAL at startup. Product search, translations and search
// history all work without Stripe, and someone who has not created a Stripe
// account yet should still be able to run the application. Anything that
// genuinely needs Stripe fails loudly at the point of use instead - see
// src/stripe.ts.
//
// Nothing here has a default value. A secret with a fallback is a secret waiting
// to be committed.
// ---------------------------------------------------------------------------

function readStripeConfig() {
  const secretKey = optionalEnvOrNull("STRIPE_SECRET_KEY");
  const webhookSecret = optionalEnvOrNull("STRIPE_WEBHOOK_SECRET");
  const priceId = optionalEnvOrNull("STRIPE_PRICE_ID");

  if (secretKey !== null) {
    // REFUSE LIVE KEYS.
    //
    // This is a student assignment run against test data. A live key here could
    // move real money, and the mistake is a single character in a .env file.
    // Stripe makes the distinction visible in the key itself, so we check it.
    if (secretKey.startsWith("sk_live_")) {
      throw new Error(
        "STRIPE_SECRET_KEY is a LIVE key (sk_live_...). This project is test-mode only. " +
          "Use a test key from https://dashboard.stripe.com/test/apikeys (it starts with sk_test_)."
      );
    }

    if (!secretKey.startsWith("sk_test_")) {
      throw new Error(
        `STRIPE_SECRET_KEY does not look like a Stripe secret key. Expected it to start with "sk_test_".`
      );
    }
  }

  // Webhook signing secrets always start with whsec_, in both modes.
  if (webhookSecret !== null && !webhookSecret.startsWith("whsec_")) {
    throw new Error(
      `STRIPE_WEBHOOK_SECRET does not look like a Stripe webhook secret. Expected it to start with "whsec_".`
    );
  }

  if (priceId !== null && !priceId.startsWith("price_")) {
    throw new Error(
      `STRIPE_PRICE_ID does not look like a Stripe price id. Expected it to start with "price_".`
    );
  }

  return {
    secretKey,
    webhookSecret,
    priceId,
    // True only when everything needed to start a subscription is present.
    // The webhook secret is checked separately: receiving webhooks and creating
    // checkout sessions can be configured at different times.
    isConfigured: secretKey !== null && priceId !== null,
  };
}

export const env = {
  port: Number(optionalEnv("PORT", "4000")),
  frontendOrigin: optionalEnv("FRONTEND_ORIGIN", "http://localhost:3000"),
  databaseUrl: requireEnv("DATABASE_URL"),
  nodeEnv: optionalEnv("NODE_ENV", "development"),

  openFoodFacts: {
    baseUrl: optionalEnv("OFF_BASE_URL", "https://world.openfoodfacts.org"),

    // Open Food Facts asks every application to identify itself in the
    // User-Agent header, and blocks anonymous or generic clients. This is a
    // courtesy requirement of a free, donation-funded service - respect it.
    userAgent: optionalEnv(
      "OFF_USER_AGENT",
      "FoodFinder/1.0 (student assignment; https://github.com/local/food-finder)"
    ),

    // Measured: real searches took 7-21 seconds. A short timeout would fail
    // constantly on a service that is simply slow, so we are generous.
    timeoutMs: optionalNumber("OFF_TIMEOUT_MS", 25000),

    // How many products to request per search.
    pageSize: optionalNumber("OFF_PAGE_SIZE", 20),
  },

  stripe: readStripeConfig(),
} as const;

export const isProduction = env.nodeEnv === "production";
