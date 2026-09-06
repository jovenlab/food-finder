// Turns a backend error code into a TRANSLATION KEY, and decides whether
// offering a "Try again" button makes sense.
//
// Note what this file returns: a key, not a sentence. The actual wording is
// looked up in the user's language by whoever displays it. Returning English
// text here would make error messages the one part of the interface that never
// translates.

import { ApiError } from "./api";
import type { TranslationKey } from "./i18n/translations";

// Keyed by the `code` field the backend sends. Codes are stable; the wording in
// translations.ts can change freely, which is exactly why we switch on the code.
const MESSAGE_KEYS: Record<string, TranslationKey> = {
  NETWORK_ERROR: "errorNetwork",
  EXTERNAL_API_ERROR: "errorExternalApi",
  EXTERNAL_API_TIMEOUT: "errorTimeout",
  EMPTY_SEARCH_TERM: "errorEmptyTerm",
  SEARCH_TERM_TOO_LONG: "errorTooLong",
  UNSUPPORTED_LANGUAGE: "errorUnsupportedLanguage",
  INTERNAL_ERROR: "errorGeneric",

  // Checkout-specific failures.
  STRIPE_ERROR: "errorStripe",
  STRIPE_NO_CHECKOUT_URL: "errorStripe",
  STRIPE_NOT_CONFIGURED: "errorStripeNotConfigured",
  ALREADY_SUBSCRIBED: "errorAlreadySubscribed",
  DEMO_USER_MISSING: "errorGeneric",
  DATABASE_UNAVAILABLE: "errorGeneric",
};

const FALLBACK_KEY: TranslationKey = "errorGeneric";

export function errorMessageKey(error: unknown): TranslationKey {
  if (error instanceof ApiError) {
    return MESSAGE_KEYS[error.code] ?? FALLBACK_KEY;
  }
  return FALLBACK_KEY;
}

// Some failures are worth retrying unchanged: the server was down, the external
// API was busy, the request timed out. Others will fail identically until the
// user edits their input, and offering "Try again" there would just be a button
// that never works.
const RETRYABLE_CODES = new Set([
  "NETWORK_ERROR",
  "EXTERNAL_API_ERROR",
  "EXTERNAL_API_TIMEOUT",
  "INTERNAL_ERROR",
  "UNKNOWN_ERROR",
  // Stripe being briefly unreachable is exactly the case retrying fixes.
  "STRIPE_ERROR",
  "DATABASE_UNAVAILABLE",
]);

export function isRetryable(error: unknown): boolean {
  return error instanceof ApiError && RETRYABLE_CODES.has(error.code);
}

export function errorCodeOf(error: unknown): string {
  return error instanceof ApiError ? error.code : "UNKNOWN_ERROR";
}
