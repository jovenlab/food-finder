// Tests for the search endpoint as an HTTP API.
//
// These start the REAL Express app and send it real HTTP requests. That is
// possible only because Milestone 5 separated "build the app" (createApp) from
// "start the server" (index.ts) - a test can build an app and listen on a random
// free port, so nothing collides with a development server.
//
// The two collaborators are replaced:
//   * Open Food Facts   -> a stubbed fetch, so no network and no rate limits
//   * the access rule   -> a stub, so we can be entitled or not on demand
//
// Note what that leaves REAL: the routing, the query-parameter validation, the
// error handler, and - crucially - the code that decides whether nutritional
// values are written into the response. The rule itself is tested separately in
// subscription.test.ts; here we prove the endpoint actually consults it.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
// Vitest hoists the vi.mock calls below above every import, so the mocks are
// already in place by the time this module is loaded.
import { createApp } from "../src/app";

// Must be declared before the vi.mock factories run.
const accessMock = vi.hoisted(() => ({ canViewNutrition: false }));

vi.mock("../src/services/access.service", () => ({
  canViewNutritionSafely: async () => accessMock.canViewNutrition,
}));

// Recording a search needs the database; it is irrelevant here and is already
// covered by its own behaviour ("never throws").
vi.mock("../src/services/search.service", () => ({
  recordSearchSafely: async () => undefined,
}));

// Keep a reference to the REAL fetch before any test replaces the global one.
//
// Without this the test helper below would call its own stub instead of the
// server: `vi.stubGlobal("fetch", ...)` replaces fetch for everyone in the
// process, including the test.
const realFetch = globalThis.fetch;

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp();

  // Port 0 means "any free port". Two test files can never fight over it.
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function stubOpenFoodFacts(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => body,
    }))
  );
}

const PRODUCT = {
  code: "3017620422003",
  lang: "en",
  product_name: "Nutella",
  brands: "Ferrero",
  image_url: "https://images.openfoodfacts.org/nutella.jpg",
  quantity: "400 g",
  nutriscore_grade: "e",
  nutriments: { "energy-kcal_100g": 539, fat_100g: 30.9, sugars_100g: 56.3 },
};

beforeEach(() => {
  accessMock.canViewNutrition = false;
  stubOpenFoodFacts({ count: 1031, products: [PRODUCT] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Returns the parsed body AND the raw text. The raw text matters: it is the only
// way to prove nothing leaked, because a value could hide in a field we forgot
// to assert on.
async function get(path: string) {
  const response = await realFetch(`${baseUrl}${path}`);
  const text = await response.text();
  return { status: response.status, text, body: JSON.parse(text) };
}

describe("GET /products/search", () => {
  it("returns products with the public fields everyone may see", async () => {
    const { status, body } = await get("/products/search?q=nutella");

    expect(status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.products[0]).toMatchObject({
      name: "Nutella",
      brand: "Ferrero",
      imageUrl: "https://images.openfoodfacts.org/nutella.jpg",
    });
  });

  it("reports a search that found nothing as a SUCCESS", async () => {
    stubOpenFoodFacts({ count: 0, products: [] });

    const { status, body } = await get("/products/search?q=zzzznotafood");

    // 200, not 404. Nothing is broken; there is simply nothing to show.
    expect(status).toBe(200);
    expect(body.count).toBe(0);
    expect(body.products).toEqual([]);
  });

  it("rejects a missing search term with 400", async () => {
    const { status, body } = await get("/products/search");

    expect(status).toBe(400);
    expect(body.error.code).toBe("EMPTY_SEARCH_TERM");
  });

  it("rejects a repeated q parameter instead of crashing", async () => {
    // Express hands us an ARRAY for ?q=a&q=b. Calling .trim() on it would throw.
    const { status, body } = await get("/products/search?q=milk&q=bread");

    expect(status).toBe(400);
    expect(body.error.code).toBe("EMPTY_SEARCH_TERM");
  });

  it("rejects an unsupported language rather than silently using English", async () => {
    const { status, body } = await get("/products/search?q=milk&lang=es");

    expect(status).toBe(400);
    expect(body.error.code).toBe("UNSUPPORTED_LANGUAGE");
  });

  it("passes an upstream failure through as 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => null,
      }))
    );

    const { status, body } = await get("/products/search?q=nutella");

    expect(status).toBe(502);
    expect(body.error.code).toBe("EXTERNAL_API_ERROR");
  });
});

// ---------------------------------------------------------------------------
// The requirement this whole project is built around.
// ---------------------------------------------------------------------------

describe("nutritional data is protected", () => {
  it("WITHHOLDS nutrition when there is no active subscription", async () => {
    accessMock.canViewNutrition = false;

    const { body, text } = await get("/products/search?q=nutella");

    expect(body.access.nutrition).toBe(false);
    expect(body.products[0].nutrition).toBeNull();

    // The values are not merely hidden - they are not in the response at all.
    // This assertion is the one that would catch a leak, because it searches the
    // entire payload rather than the fields we thought to check.
    expect(text).not.toContain("energyKcal");
    expect(text).not.toContain("539");

    // The user is still told that data EXISTS, so we can offer a subscription
    // honestly without revealing anything.
    expect(body.products[0].nutritionAvailable).toBe(true);

    // And everything public is still there.
    expect(body.products[0].name).toBe("Nutella");
    expect(body.products[0].brand).toBe("Ferrero");
    expect(body.products[0].imageUrl).not.toBeNull();
  });

  it("INCLUDES nutrition when the subscription is active", async () => {
    accessMock.canViewNutrition = true;

    const { body } = await get("/products/search?q=nutella");

    expect(body.access.nutrition).toBe(true);
    expect(body.products[0].nutrition).toMatchObject({
      energyKcal: 539,
      fat: 30.9,
      sugars: 56.3,
    });
  });

  it("says 'no data' rather than 'locked' when the product has no nutrition", async () => {
    // These two situations must not look the same: offering a subscription to
    // see values that do not exist would be dishonest.
    accessMock.canViewNutrition = false;
    stubOpenFoodFacts({ count: 1, products: [{ ...PRODUCT, nutriments: {} }] });

    const { body } = await get("/products/search?q=nutella");

    expect(body.products[0].nutritionAvailable).toBe(false);
    expect(body.products[0].nutrition).toBeNull();
  });

  // Anything a caller can put in a request, tried as a way in.
  it.each([
    "?q=nutella&nutrition=true",
    "?q=nutella&access=true",
    "?q=nutella&subscribed=true",
    "?q=nutella&userId=1",
    "?q=nutella&access[nutrition]=true",
  ])("cannot be unlocked by the query string: %s", async (query) => {
    accessMock.canViewNutrition = false;

    const { body, text } = await get(`/products/search${query}`);

    expect(body.access.nutrition).toBe(false);
    expect(text).not.toContain("energyKcal");
  });
});
