// Everything this application knows about Open Food Facts lives in this file.
//
// It has one job: take a search term and a language, and return OUR product
// type. Nothing above this layer ever sees an Open Food Facts field name, an
// empty string that secretly means null, or a number that arrived as text.
//
// WHY THE BACKEND CALLS THIS API AND NOT THE BROWSER
//   1. The browser would be blocked by CORS.
//   2. Open Food Facts requires a User-Agent identifying the application, which
//      a browser will not let us set.
//   3. Milestone 16 must hide nutrition data from users without a subscription.
//      That is impossible if the browser fetches the data itself.

import { env } from "../config/env";
import { badRequest, badGateway, gatewayTimeout } from "../errors/AppError";
import type {
  Language,
  Nutrition,
  Product,
  ProductSearchResult,
} from "../types/product";

// Longest search term we accept. Open Food Facts does not benefit from more,
// and an unbounded string is an easy way to abuse an endpoint.
const MAX_TERM_LENGTH = 100;

// The exact fields we ask Open Food Facts for. Requesting only what we use keeps
// the response small and fast - a full product object has over 200 fields.
// The product_name_xx entries are how we get translated names (Milestone 10).
const REQUESTED_FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "product_name_nl",
  "product_name_de",
  "product_name_fr",
  "brands",
  "image_url",
  "quantity",
  "nutriscore_grade",
  "nutriments",
].join(",");

// ---------------------------------------------------------------------------
// Small helpers for untrusted data.
//
// Every value below arrives as `unknown` on purpose. Open Food Facts is a
// community-edited database: a field can be absent, an empty string, or a number
// written as text. Checking rather than trusting is the whole point.
// ---------------------------------------------------------------------------

// Returns a non-empty trimmed string, or null. Treats "" as missing, which we
// confirmed is how Open Food Facts represents a blank product name.
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Returns a finite number, or null. Accepts "12.5" as well as 12.5.
function numeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Translating one raw product into our Product type.
// ---------------------------------------------------------------------------

// A raw product is an object with unknown contents. The index signature lets us
// read dynamic keys such as `product_name_de`.
type RawProduct = Record<string, unknown>;

// Picks the best available name for the requested language.
//
// Order: the requested language, then the product default name, then English.
// If none exist we return null rather than inventing something - the assignment
// is explicit that we must not fabricate translations.
function resolveName(raw: RawProduct, language: Language): string | null {
  return (
    text(raw[`product_name_${language}`]) ??
    text(raw["product_name"]) ??
    text(raw["product_name_en"])
  );
}

// Open Food Facts stores brands as one comma-separated string, for example
// "Nutella, Ferrero, Yum yum". We show only the first, which is the primary
// brand; the rest are usually parent companies or duplicates.
function resolveBrand(raw: RawProduct): string | null {
  const brands = text(raw["brands"]);
  if (!brands) return null;

  const first = brands.split(",")[0];
  return text(first);
}

// Reads the eight nutrition values we display, all per 100g.
//
// Returns null when the product has no nutritional data at all, so that
// "we have nothing" stays clearly different from "we have some values".
function resolveNutrition(raw: RawProduct): Nutrition | null {
  const nutriments = raw["nutriments"];
  if (typeof nutriments !== "object" || nutriments === null) return null;

  const source = nutriments as Record<string, unknown>;

  const nutrition: Nutrition = {
    energyKcal: numeric(source["energy-kcal_100g"]),
    fat: numeric(source["fat_100g"]),
    saturatedFat: numeric(source["saturated-fat_100g"]),
    carbohydrates: numeric(source["carbohydrates_100g"]),
    sugars: numeric(source["sugars_100g"]),
    fiber: numeric(source["fiber_100g"]),
    proteins: numeric(source["proteins_100g"]),
    salt: numeric(source["salt_100g"]),
  };

  const hasAtLeastOneValue = Object.values(nutrition).some((value) => value !== null);
  return hasAtLeastOneValue ? nutrition : null;
}

function toProduct(raw: RawProduct, language: Language): Product | null {
  const code = text(raw["code"]);

  // Without a barcode we have no identifier, so the entry is unusable.
  if (!code) return null;

  return {
    code,
    name: resolveName(raw, language),
    brand: resolveBrand(raw),
    imageUrl: text(raw["image_url"]),
    quantity: text(raw["quantity"]),
    nutriScore: text(raw["nutriscore_grade"]),
    nutrition: resolveNutrition(raw),
  };
}

// A product with neither a name nor a brand cannot be recognised by a human, so
// showing it would just be a blank card. Measured against real data: roughly one
// in five "milk" results has no usable name.
//
// This is a deliberate product decision, kept as its own named function so it is
// easy to find and easy to change.
function isDisplayable(product: Product): boolean {
  return product.name !== null || product.brand !== null;
}

// ---------------------------------------------------------------------------
// Talking to Open Food Facts.
// ---------------------------------------------------------------------------

function buildSearchUrl(term: string, language: Language): string {
  // URLSearchParams escapes the term for us, so a search for "a&b" or "50% cocoa"
  // cannot break the URL or inject extra parameters.
  const params = new URLSearchParams({
    search_terms: term,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(env.openFoodFacts.pageSize),
    // `lc` = language code. It selects translated text AND, we confirmed by
    // testing, the language-specific product photo.
    lc: language,
    fields: REQUESTED_FIELDS,
  });

  // NOTE: we use the older /cgi/search.pl endpoint on purpose. The newer
  // /api/v2/search silently IGNORES free-text terms - we tested it, and a search
  // for "nutella" returned unrelated products and a count of 4.7 million. v2
  // filters by tags only, so it cannot do what this assignment needs.
  return `${env.openFoodFacts.baseUrl}/cgi/search.pl?${params.toString()}`;
}

// Node's fetch reports every network problem as the useless message
// "fetch failed" and buries the real reason in `error.cause`. Worse, that cause
// is usually an AggregateError whose own message is EMPTY - the detail lives in
// its `code` ("ECONNREFUSED") and in an `errors` array, one entry per address
// Node tried. This digs the useful part out so log lines are debuggable.
function describeNetworkCause(error: unknown): string | null {
  if (!(error instanceof Error) || !(error.cause instanceof Error)) return null;

  const cause = error.cause as Error & { code?: unknown; errors?: unknown };

  if (typeof cause.code === "string") return cause.code;

  if (Array.isArray(cause.errors)) {
    const first = cause.errors.find((entry) => entry instanceof Error);
    if (first instanceof Error && first.message) return first.message;
  }

  return cause.message || null;
}

async function fetchSearchPayload(url: string): Promise<unknown> {
  let response: Awaited<ReturnType<typeof fetch>>;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": env.openFoodFacts.userAgent,
        Accept: "application/json",
      },
      // Without a timeout, a hanging external service would hang OUR server too.
      // AbortSignal.timeout cancels the request after the configured time.
      signal: AbortSignal.timeout(env.openFoodFacts.timeoutMs),
    });
  } catch (error) {
    // A timeout and "the network is down" arrive here the same way, but they are
    // different problems for whoever has to debug them, so we separate them.
    const name = error instanceof Error ? error.name : "";

    if (name === "TimeoutError" || name === "AbortError") {
      throw gatewayTimeout(
        `Open Food Facts did not respond within ${env.openFoodFacts.timeoutMs}ms.`
      );
    }

    const base = error instanceof Error ? error.message : "unknown network error";
    const detail = describeNetworkCause(error);

    throw badGateway(
      `Could not reach Open Food Facts: ${base}${detail ? ` (${detail})` : ""}`
    );
  }

  // A 4xx or 5xx from them. Note 429 means we exceeded their rate limit of
  // roughly 10 searches per minute.
  if (!response.ok) {
    throw badGateway(
      `Open Food Facts responded with HTTP ${response.status} ${response.statusText}.`
    );
  }

  try {
    return await response.json();
  } catch {
    // They returned 200 but the body was not JSON - typically an HTML error or
    // maintenance page. Trusting the status code alone is not enough.
    throw badGateway("Open Food Facts returned a response that was not valid JSON.");
  }
}

// ---------------------------------------------------------------------------
// The one function the rest of the application calls.
// ---------------------------------------------------------------------------

export async function searchProducts(
  rawTerm: string,
  language: Language
): Promise<ProductSearchResult> {
  const term = rawTerm.trim();

  // Caller mistakes are 400s, not 502s. We check before spending a network call.
  if (term.length === 0) {
    throw badRequest("A search term is required.", "EMPTY_SEARCH_TERM");
  }

  if (term.length > MAX_TERM_LENGTH) {
    throw badRequest(
      `Search term is too long (maximum ${MAX_TERM_LENGTH} characters).`,
      "SEARCH_TERM_TOO_LONG"
    );
  }

  const payload = await fetchSearchPayload(buildSearchUrl(term, language));

  if (typeof payload !== "object" || payload === null) {
    throw badGateway("Open Food Facts returned an unexpected response shape.");
  }

  const body = payload as { products?: unknown; count?: unknown };

  // A search with no matches is NOT an error: Open Food Facts answers HTTP 200
  // with count 0 and an empty array. If `products` is missing entirely, though,
  // the response is genuinely malformed and we say so.
  if (!Array.isArray(body.products)) {
    throw badGateway("Open Food Facts response did not contain a product list.");
  }

  const products = body.products
    .filter((entry): entry is RawProduct => typeof entry === "object" && entry !== null)
    .map((entry) => toProduct(entry, language))
    .filter((product): product is Product => product !== null)
    .filter(isDisplayable);

  return {
    term,
    language,
    totalCount: numeric(body.count) ?? 0,
    products,
  };
}
