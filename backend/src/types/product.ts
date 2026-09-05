// The shape of a product AS OUR APPLICATION SEES IT.
//
// This is deliberately not the Open Food Facts shape. Their response has dozens
// of fields, inconsistent types (numbers arrive as strings), and uses empty
// strings to mean "missing". Translating it into our own small, predictable type
// once - here at the edge of the system - means the rest of the application
// never has to think about any of that.
//
// `null` always means "Open Food Facts does not have this information".
// We never invent a value to fill a gap.

// The four languages the assignment requires.
export const SUPPORTED_LANGUAGES = ["en", "nl", "de", "fr"] as const;

// A union type meaning: the string "en", "nl", "de" or "fr" - nothing else.
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

// Narrows an untrusted string to a Language, or null if unsupported.
export function parseLanguage(value: unknown): Language | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lower as Language) ? (lower as Language) : null;
}

// Nutritional values, all per 100g/100ml, which is how Open Food Facts stores
// them. This is the information Milestone 16 will restrict to subscribers.
export type Nutrition = {
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  proteins: number | null;
  salt: number | null;
};

export type Product = {
  // The barcode. This is the only field Open Food Facts always provides, so we
  // use it as our identifier.
  code: string;

  name: string | null;

  // Which language `name` is actually in ("en", "nl", "de", "fr", or something
  // else entirely such as "es"). Null when there is no name at all.
  //
  // This is NOT always the language that was requested: a product may have no
  // Dutch name, in which case we fall back. Reporting the real language lets the
  // interface be honest about that rather than passing English off as Dutch.
  nameLanguage: string | null;

  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;

  // Open Food Facts' own health rating, "a" (best) to "e" (worst).
  nutriScore: string | null;

  // null when the product has no nutritional data at all.
  nutrition: Nutrition | null;
};

export type ProductSearchResult = {
  term: string;
  language: Language;

  // How many products Open Food Facts matched in total. Usually larger than
  // products.length, because we ask for a single page and then drop entries
  // too incomplete to display.
  totalCount: number;

  products: Product[];
};
