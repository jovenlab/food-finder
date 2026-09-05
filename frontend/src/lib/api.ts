// The only file in the frontend that talks to our backend.
//
// Keeping fetch out of the components means a component never has to think
// about URLs, status codes or JSON parsing - it just calls a function and gets
// either data or an error it can display.

import type {
  ApiErrorBody,
  CheckoutSessionResponse,
  MeResponse,
  Product,
  RecentSearchesResponse,
  SearchResponse,
} from "./types";

// Set in .env.local. The NEXT_PUBLIC_ prefix is what allows the browser to read
// it - variables without that prefix stay on the server. Never put a secret in
// a NEXT_PUBLIC_ variable: it is shipped to every visitor.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// An error we can actually show to the user.
//
// It carries the backend's `code` (a stable string like "EMPTY_SEARCH_TERM") as
// well as the message, so the interface can react to specific failures rather
// than showing one generic message for everything.
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// Reads the backend's error shape without trusting it blindly. If the backend is
// broken, or something else answered (a proxy, a captive portal), the body may
// not look like our contract at all.
function readErrorBody(body: unknown, status: number): ApiError {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as ApiErrorBody).error?.code === "string" &&
    typeof (body as ApiErrorBody).error?.message === "string"
  ) {
    const { code, message } = (body as ApiErrorBody).error;
    return new ApiError(message, code, status);
  }

  return new ApiError(`Request failed with status ${status}.`, "UNKNOWN_ERROR", status);
}

// One place where every request is made.
//
// Extracted because the four functions below were about to repeat the same
// twenty lines of cancellation, network-failure, non-JSON and error-status
// handling. Now each of them is one line, and a fix to any of that behaviour
// applies everywhere at once.
async function request<T>(
  path: string,
  options: { method?: string; signal?: AbortSignal } = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(new URL(path, API_URL), {
      method: options.method ?? "GET",
      signal: options.signal,
    });
  } catch (error) {
    // We cancelled this request on purpose. The caller must ignore it rather
    // than show an error, so it gets its own code.
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request cancelled.", "ABORTED", 0);
    }

    // fetch only rejects when the request never completed: the backend is not
    // running, the network is down, DNS failed. A 404 or 500 is a SUCCESSFUL
    // fetch with a bad status, handled just below.
    throw new ApiError(
      "Could not reach the server. Is the backend running?",
      "NETWORK_ERROR",
      0
    );
  }

  // Parse the body once. `.catch` covers a response that is not JSON at all.
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw readErrorBody(body, response.status);
  }

  return body as T;
}

export async function searchProducts(
  term: string,
  language = "en",
  // Lets the caller cancel this request when a newer search starts. Without it,
  // a slow earlier search can finish last and overwrite newer results.
  signal?: AbortSignal
): Promise<SearchResponse> {
  // URLSearchParams escapes the term for us, so "50% cocoa & nuts" cannot break
  // the query string.
  const params = new URLSearchParams({ q: term, lang: language });

  return request<SearchResponse>(`/products/search?${params.toString()}`, { signal });
}

// Loads the demo user's recent searches.
//
// A convenience feature: the caller is expected to treat a failure as "no
// history to show" rather than as a problem worth interrupting the user about.
export async function fetchRecentSearches(
  signal?: AbortSignal
): Promise<RecentSearchesResponse> {
  return request<RecentSearchesResponse>("/searches/recent", { signal });
}

// Loads who we are, and what we are allowed to see.
export async function fetchMe(signal?: AbortSignal): Promise<MeResponse> {
  return request<MeResponse>("/me", { signal });
}

// Asks the backend to create a Stripe Checkout session.
//
// POST because it creates something on Stripe's side. The backend answers with
// a URL rather than redirecting, so this page decides when to navigate - and can
// show an error instead if the request failed.
export async function createCheckoutSession(): Promise<CheckoutSessionResponse> {
  return request<CheckoutSessionResponse>("/checkout/session", { method: "POST" });
}

// Re-exported so components can import their types from one place.
export type { Product, SearchResponse };
