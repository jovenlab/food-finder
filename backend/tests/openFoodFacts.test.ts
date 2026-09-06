// Tests for the Open Food Facts integration.
//
// These never touch the real API. `fetch` is replaced with a stub that returns
// whatever the test wants, which buys three things:
//
//   * SPEED - the real API takes 3-20 seconds per call
//   * RELIABILITY - it rate-limits at ~10 searches/minute and intermittently
//     returns 503, so a real-API test suite would fail at random
//   * CONTROL - we can produce a malformed response on demand, which is the
//     whole point: we are testing how we cope with bad data

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchProducts } from "../src/services/openFoodFacts.service";
import { AppError } from "../src/errors/AppError";

// Replies as Open Food Facts would, with whatever body the test supplies.
function mockOpenFoodFacts(body: unknown, init: { status?: number; text?: string } = {}) {
  const response = {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    statusText: init.status === 503 ? "Service Unavailable" : "OK",
    json: async () => {
      if (init.text !== undefined) throw new SyntaxError("Unexpected token <");
      return body;
    },
  };

  vi.stubGlobal("fetch", vi.fn(async () => response));
}

// One product, in the shape Open Food Facts really sends.
function rawProduct(overrides: Record<string, unknown> = {}) {
  return {
    code: "3017620422003",
    lang: "en",
    product_name: "Nutella",
    product_name_en: "Nutella",
    product_name_fr: "Nutella pâte à tartiner",
    brands: "Nutella, Ferrero",
    image_url: "https://images.openfoodfacts.org/nutella.jpg",
    quantity: "400 g",
    nutriscore_grade: "e",
    nutriments: { "energy-kcal_100g": 539, fat_100g: 30.9, sugars_100g: 56.3 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchProducts - a normal search", () => {
  it("returns products in our own shape, not Open Food Facts' shape", async () => {
    mockOpenFoodFacts({ count: 1031, products: [rawProduct()] });

    const result = await searchProducts("nutella", "en");

    expect(result.totalCount).toBe(1031);
    expect(result.products).toHaveLength(1);

    // Note what this asserts: OUR field names. Nothing above this layer should
    // ever see `product_name` or `nutriscore_grade`.
    expect(result.products[0]).toMatchObject({
      code: "3017620422003",
      name: "Nutella",
      brand: "Nutella", // first entry of "Nutella, Ferrero"
      imageUrl: "https://images.openfoodfacts.org/nutella.jpg",
      quantity: "400 g",
      nutriScore: "e",
    });
  });

  it("keeps only the first brand from the comma-separated list", async () => {
    mockOpenFoodFacts({ count: 1, products: [rawProduct({ brands: "  Brand A , Brand B " })] });

    const result = await searchProducts("x", "en");

    expect(result.products[0].brand).toBe("Brand A");
  });

  it("asks for the requested language and reports which language it got back", async () => {
    mockOpenFoodFacts({ count: 1, products: [rawProduct()] });

    const result = await searchProducts("nutella", "fr");

    expect(result.products[0].name).toBe("Nutella pâte à tartiner");
    expect(result.products[0].nameLanguage).toBe("fr");
  });

  it("falls back to another language and SAYS SO rather than pretending", async () => {
    // No Dutch name exists. We must not present the English one as Dutch - the
    // assignment forbids inventing translations.
    mockOpenFoodFacts({ count: 1, products: [rawProduct()] });

    const result = await searchProducts("nutella", "nl");

    expect(result.products[0].name).toBe("Nutella");
    expect(result.products[0].nameLanguage).toBe("en");
  });
});

describe("searchProducts - incomplete data", () => {
  it("turns missing and empty fields into null", async () => {
    // Real Open Food Facts data uses "" and absent fields interchangeably for
    // "we do not know". Both must become null so the rest of the app has one
    // thing to check.
    mockOpenFoodFacts({
      count: 1,
      products: [
        {
          code: "111",
          product_name: "",
          product_name_en: "Something",
          brands: "",
          quantity: "",
          nutriments: {},
        },
      ],
    });

    const result = await searchProducts("x", "en");

    expect(result.products[0]).toMatchObject({
      brand: null,
      imageUrl: null,
      quantity: null,
      nutriScore: null,
      nutrition: null, // an empty nutriments object means "nothing", not "zeros"
    });
  });

  it("accepts numbers that arrive as text, and rejects nonsense", async () => {
    mockOpenFoodFacts({
      count: 1,
      products: [
        rawProduct({
          nutriments: { "energy-kcal_100g": "250.5", fat_100g: "not a number", salt_100g: 0 },
        }),
      ],
    });

    const result = await searchProducts("x", "en");

    expect(result.products[0].nutrition).toMatchObject({
      energyKcal: 250.5, // "250.5" parsed
      fat: null, // garbage rejected rather than becoming NaN
      salt: 0, // a real zero survives; it is not treated as missing
    });
  });

  it("drops entries that no human could identify", async () => {
    // A product with neither name nor brand would render as a blank card.
    mockOpenFoodFacts({
      count: 4,
      products: [
        null,
        "not an object",
        { code: "222", product_name: "", brands: "" }, // nothing to show
        rawProduct({ code: "333" }), // fine
      ],
    });

    const result = await searchProducts("x", "en");

    expect(result.products).toHaveLength(1);
    expect(result.products[0].code).toBe("333");
  });
});

describe("searchProducts - nothing found", () => {
  it("returns an empty list, and does NOT treat it as an error", async () => {
    // The distinction that matters: "we found nothing" is a successful search.
    mockOpenFoodFacts({ count: 0, products: [] });

    const result = await searchProducts("zzzznotafood", "en");

    expect(result.products).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});

describe("searchProducts - bad input from our own caller", () => {
  it("rejects an empty term without calling the API at all", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(searchProducts("   ", "en")).rejects.toThrowError(
      expect.objectContaining({ code: "EMPTY_SEARCH_TERM", statusCode: 400 })
    );

    // No point spending a network call on a request we know is invalid.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects an over-long term", async () => {
    await expect(searchProducts("a".repeat(101), "en")).rejects.toThrowError(
      expect.objectContaining({ code: "SEARCH_TERM_TOO_LONG", statusCode: 400 })
    );
  });
});

describe("searchProducts - when Open Food Facts misbehaves", () => {
  it("reports an upstream error as 502, not 500", async () => {
    // 502 says "someone else's outage"; 500 would say "our bug". They need
    // completely different debugging, so they must not look the same.
    mockOpenFoodFacts(null, { status: 503 });

    await expect(searchProducts("nutella", "en")).rejects.toThrowError(
      expect.objectContaining({ code: "EXTERNAL_API_ERROR", statusCode: 502 })
    );
  });

  it("handles a 200 response that is not JSON", async () => {
    // Typically an HTML maintenance page. Trusting the status code is not enough.
    mockOpenFoodFacts(null, { text: "<html>maintenance</html>" });

    await expect(searchProducts("nutella", "en")).rejects.toThrowError(
      expect.objectContaining({ code: "EXTERNAL_API_ERROR" })
    );
  });

  it("handles JSON without a product list", async () => {
    mockOpenFoodFacts({ count: 5 });

    await expect(searchProducts("nutella", "en")).rejects.toThrowError(
      expect.objectContaining({ code: "EXTERNAL_API_ERROR" })
    );
  });

  it("reports a timeout as 504", async () => {
    // AbortSignal.timeout raises an error named TimeoutError.
    const timeout = Object.assign(new Error("The operation was aborted"), {
      name: "TimeoutError",
    });
    vi.stubGlobal("fetch", vi.fn(async () => { throw timeout; }));

    await expect(searchProducts("nutella", "en")).rejects.toThrowError(
      expect.objectContaining({ code: "EXTERNAL_API_TIMEOUT", statusCode: 504 })
    );
  });

  it("logs the underlying reason but does NOT put it in the response", async () => {
    // Two requirements at once, and they pull in opposite directions:
    //
    //   * whoever debugs this needs the real reason
    //   * whoever made the request must not receive it
    //
    // An AppError message is shown to the caller, so an upstream error message
    // must never be interpolated into one. Node's network errors quote the URL
    // being fetched, which can carry credentials.
    const networkError = Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error(""), { code: "ECONNREFUSED" }),
    });
    vi.stubGlobal("fetch", vi.fn(async () => { throw networkError; }));

    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = await searchProducts("nutella", "en").catch((e) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("EXTERNAL_API_ERROR");

    // The caller learns nothing about our internals.
    expect(error.message).toBe("Could not reach Open Food Facts.");
    expect(error.message).not.toContain("ECONNREFUSED");

    // But the log has what a developer needs.
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("ECONNREFUSED"));

    logged.mockRestore();
  });
});
