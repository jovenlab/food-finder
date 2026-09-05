// Turns a backend error code into something a human should read, and decides
// whether offering a "Try again" button makes sense.
//
// Why not just show the backend's message? Because those are written for a
// developer debugging a problem ("Open Food Facts responded with HTTP 503
// Service Temporarily Unavailable"). A user needs to know what to DO.

import { ApiError } from "./api";

// Keyed by the `code` field the backend sends. Codes are stable; messages are
// not, which is exactly why we switch on the code rather than the text.
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR:
    "Could not reach the server. Check that the backend is running, then try again.",

  EXTERNAL_API_ERROR:
    "Open Food Facts is temporarily unavailable. This usually means too many searches in a short time — wait a moment and try again.",

  EXTERNAL_API_TIMEOUT:
    "Open Food Facts took too long to respond. It can be slow at busy times — please try again.",

  EMPTY_SEARCH_TERM: "Please enter something to search for.",

  SEARCH_TERM_TOO_LONG:
    "That search term is too long. Try something shorter — a product or brand name works best.",

  UNSUPPORTED_LANGUAGE: "That language is not supported.",

  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
};

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export function friendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return MESSAGES[error.code] ?? FALLBACK_MESSAGE;
  }
  return FALLBACK_MESSAGE;
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
]);

export function isRetryable(error: unknown): boolean {
  return error instanceof ApiError && RETRYABLE_CODES.has(error.code);
}

export function errorCodeOf(error: unknown): string {
  return error instanceof ApiError ? error.code : "UNKNOWN_ERROR";
}
