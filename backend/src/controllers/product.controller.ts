// The HTTP layer for product search.
//
// This controller does three things and nothing else:
//   1. read and validate the query parameters
//   2. call the service that does the real work
//   3. shape the response our API promises
//
// It contains no knowledge of Open Food Facts. Swap that service for a different
// data source and this file would not change.

import type { Request, Response } from "express";
import { badRequest } from "../errors/AppError";
import { searchProducts } from "../services/openFoodFacts.service";
import { recordSearchSafely } from "../services/search.service";
import { canViewNutritionSafely } from "../services/access.service";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  parseLanguage,
  type Language,
  type Nutrition,
  type Product,
  type ProductSearchResult,
} from "../types/product";

// ---------------------------------------------------------------------------
// The response type. This IS our API contract - if you change this type, you
// change what the frontend receives, so keep it deliberate.
// ---------------------------------------------------------------------------

type ProductResponse = {
  code: string;
  name: string | null;

  // The language `name` is really in, which may differ from the requested one
  // when the product has no name in that language. Lets the frontend show
  // "this name is not in the language you chose" instead of silently
  // substituting another language.
  nameLanguage: string | null;

  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  nutriScore: string | null;

  // Whether Open Food Facts HAS nutritional data for this product.
  //
  // Always present, for everyone. Knowing that data exists is not the same as
  // seeing it, and the interface needs this to offer a subscription honestly.
  nutritionAvailable: boolean;

  // The values themselves - ONLY when the user is entitled to them.
  //
  // Together the two fields say exactly which situation we are in:
  //   nutritionAvailable: false, nutrition: null   -> no data exists
  //   nutritionAvailable: true,  nutrition: null   -> data exists, not entitled
  //   nutritionAvailable: true,  nutrition: {...}  -> data exists, entitled
  nutrition: Nutrition | null;
};

type SearchResponse = {
  term: string;
  language: Language;

  // How many products Open Food Facts matched overall. Usually much larger than
  // `count`, because we request a single page and then drop entries too
  // incomplete to display.
  totalCount: number;

  // How many products are in the `products` array below.
  count: number;

  // What this caller is allowed to see. Included so the interface can explain
  // WHY nutrition is null without having to cross-reference GET /me - and so
  // there is no window where the two disagree.
  access: {
    nutrition: boolean;
  };

  products: ProductResponse[];
};

// ---------------------------------------------------------------------------
// Reading query parameters safely.
// ---------------------------------------------------------------------------

// Express does not guarantee a query parameter is a string. A URL like
// "?q=milk&q=bread" gives us an ARRAY, and "?q[a]=1" can give an object. Calling
// .trim() on either would crash the request, so we check the type first and
// treat anything unexpected as "not provided".
function readSingleQueryParam(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readLanguage(rawValue: unknown): Language {
  const raw = readSingleQueryParam(rawValue);

  // Absent or blank means "the caller did not choose", so use the default.
  if (raw === null || raw.trim() === "") return DEFAULT_LANGUAGE;

  const language = parseLanguage(raw);

  // A language we do not support is a caller mistake, so we say so plainly
  // instead of silently falling back to English. Silent fallbacks hide bugs:
  // the frontend would look like it works while ignoring the user's choice.
  if (language === null) {
    throw badRequest(
      `Unsupported language "${raw}". Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}.`,
      "UNSUPPORTED_LANGUAGE"
    );
  }

  return language;
}

// ---------------------------------------------------------------------------
// Shaping the response.
// ---------------------------------------------------------------------------

// THE ENFORCEMENT POINT.
//
// This is where protected data is either included in the response or left out.
// There is exactly one of these functions, and every product goes through it.
//
// Note the shape of the check: nutrition is included only when `canViewNutrition`
// is true. Not hidden, not blanked - never serialised at all. A caller who is
// not entitled receives a response that simply does not contain the values, so
// there is nothing to find in DevTools, in a proxy log, or in a saved response.
function toProductResponse(product: Product, canViewNutrition: boolean): ProductResponse {
  return {
    code: product.code,
    name: product.name,
    nameLanguage: product.nameLanguage,
    brand: product.brand,
    imageUrl: product.imageUrl,
    quantity: product.quantity,
    nutriScore: product.nutriScore,
    nutritionAvailable: product.nutrition !== null,
    nutrition: canViewNutrition ? product.nutrition : null,
  };
}

function toSearchResponse(
  result: ProductSearchResult,
  canViewNutrition: boolean
): SearchResponse {
  return {
    term: result.term,
    language: result.language,
    totalCount: result.totalCount,
    count: result.products.length,
    access: { nutrition: canViewNutrition },
    products: result.products.map((product) =>
      toProductResponse(product, canViewNutrition)
    ),
  };
}

// ---------------------------------------------------------------------------
// The route handler.
// ---------------------------------------------------------------------------

export async function searchProductsHandler(req: Request, res: Response) {
  const term = readSingleQueryParam(req.query["q"]);

  // Missing entirely, or repeated. The service also rejects a blank term, but
  // checking here gives a message that names the parameter the caller got wrong.
  if (term === null) {
    throw badRequest(
      'The "q" query parameter is required, for example /products/search?q=nutella',
      "EMPTY_SEARCH_TERM"
    );
  }

  const language = readLanguage(req.query["lang"]);

  // Anything thrown below - a 400 for a blank term, a 502 if Open Food Facts is
  // down, a 504 on timeout - travels to the central error handler on its own.
  // Express 5 forwards rejected promises for us, so there is no try/catch here.
  const result = await searchProducts(term, language);

  // Record the search only now, AFTER Open Food Facts answered successfully.
  //
  // Everything that could reject the request - a blank term, an unsupported
  // language, Open Food Facts being down - has already thrown by this point, so
  // the table holds real searches rather than a log of validation mistakes.
  // A search that found nothing IS recorded: the user genuinely searched for it.
  //
  // `recordSearchSafely` cannot throw. A database problem must not turn a
  // successful product search into an error for the user.
  //
  // We await it so the row is written before we answer, which makes the
  // behaviour predictable and easy to test. The cost is a local INSERT of a few
  // milliseconds against an Open Food Facts call that takes seconds.
  await recordSearchSafely(result.term, result.language);

  // Ask the SERVER whether this user may see nutritional values.
  //
  // The browser is never consulted and never trusted: it does not send a token,
  // a flag or a claim of any kind, and there is no request parameter that could
  // influence this answer. The rule lives in access.service.ts, which reads the
  // subscription state that Stripe webhooks maintain.
  //
  // canViewNutritionSafely FAILS CLOSED - if the database is unreachable we
  // cannot prove entitlement, so we withhold rather than guess.
  const canViewNutrition = await canViewNutritionSafely();

  res.json(toSearchResponse(result, canViewNutrition));
}
