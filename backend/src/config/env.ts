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
} as const;

export const isProduction = env.nodeEnv === "production";
