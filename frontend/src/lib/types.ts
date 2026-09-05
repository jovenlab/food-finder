// TypeScript mirror of the backend's API contract.
//
// The authoritative version is backend/API.md. If these two ever disagree, the
// backend wins - but keeping this file in step means TypeScript catches a
// mismatch at compile time instead of the page crashing in a user's browser.

// One product, exactly as GET /products/search returns it.
export type Product = {
  // Barcode. Always present, so we use it as the React list key.
  code: string;

  // `null` means Open Food Facts does not have this information.
  // It is never an empty string - the backend normalises that away.
  name: string | null;

  // Which language `name` is ACTUALLY in - not necessarily the one requested.
  // Open Food Facts has no Dutch name for many products, so asking for Dutch
  // often returns English. This lets us say so instead of pretending.
  // Can be any code Open Food Facts uses ("es", "ar", ...), not just our four.
  nameLanguage: string | null;

  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  nutriScore: string | null;

  // Whether nutritional data EXISTS for this product. Deliberately not the
  // values: those require an active subscription and arrive in Milestone 16.
  nutritionAvailable: boolean;
};

export type SearchResponse = {
  term: string;
  language: string;

  // How many products Open Food Facts matched in total.
  totalCount: number;

  // How many products are in the array below. Usually much smaller.
  count: number;

  products: Product[];
};

// The shape of every error the backend returns.
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};
