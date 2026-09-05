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
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  parseLanguage,
  type Language,
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

  // Whether Open Food Facts has nutritional data for this product.
  //
  // Deliberately a boolean and NOT the values themselves. The assignment says
  // nutritional detail requires an active subscription, and the coding rules say
  // never to expose it through an endpoint that does not enforce that check.
  // Milestone 16 adds the values here, behind the subscription check.
  // This flag lets the frontend say "nutrition available" without leaking it.
  nutritionAvailable: boolean;
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

function toProductResponse(product: Product): ProductResponse {
  return {
    code: product.code,
    name: product.name,
    nameLanguage: product.nameLanguage,
    brand: product.brand,
    imageUrl: product.imageUrl,
    quantity: product.quantity,
    nutriScore: product.nutriScore,
    nutritionAvailable: product.nutrition !== null,
  };
}

function toSearchResponse(result: ProductSearchResult): SearchResponse {
  return {
    term: result.term,
    language: result.language,
    totalCount: result.totalCount,
    count: result.products.length,
    products: result.products.map(toProductResponse),
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

  res.json(toSearchResponse(result));
}
