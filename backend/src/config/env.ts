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

export const env = {
  port: Number(optionalEnv("PORT", "4000")),
  frontendOrigin: optionalEnv("FRONTEND_ORIGIN", "http://localhost:3000"),
  databaseUrl: requireEnv("DATABASE_URL"),
  nodeEnv: optionalEnv("NODE_ENV", "development"),
} as const;

export const isProduction = env.nodeEnv === "production";
