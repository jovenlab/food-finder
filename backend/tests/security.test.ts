// Security properties of the HTTP layer.
//
// These are the rules that are easy to break by accident and impossible to
// notice by looking at the screen - exactly the kind of thing that belongs in a
// test rather than a checklist someone re-reads once a year.

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { createApp } from "../src/app";

// NODE_ENV has to be set before config/env.ts is imported, because it reads
// process.env once at module load. vi.hoisted runs before the imports above.
vi.hoisted(() => {
  process.env["NODE_ENV"] = "production";
});

vi.mock("../src/services/access.service", () => ({
  canViewNutritionSafely: async () => false,
}));

vi.mock("../src/services/search.service", () => ({
  recordSearchSafely: async () => undefined,
}));

const realFetch = globalThis.fetch;

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp();
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

describe("error responses in production", () => {
  it("does NOT leak the details of an unexpected failure", async () => {
    // Make Open Food Facts throw something we never anticipated. That reaches
    // the error handler as a plain Error rather than an AppError, which is the
    // path that could leak a stack trace, a file path or a table name.
    const secret = "postgres://admin:hunter2@internal-db.example.com/private";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error(`Connection failed for ${secret}`);
      })
    );

    const response = await realFetch(`${baseUrl}/products/search?q=nutella`);
    const text = await response.text();

    vi.unstubAllGlobals();

    // The caller is told something went wrong, and nothing else.
    expect(response.status).toBe(502);
    expect(text).not.toContain(secret);
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("internal-db");

    // No file paths from our machine either.
    expect(text).not.toContain("D:\\");
    expect(text).not.toContain("/src/");
  });

  it("still returns a machine-readable code the frontend can act on", async () => {
    // Hiding the detail must not mean hiding WHICH kind of failure it was - the
    // interface needs that to decide whether offering "Try again" makes sense.
    const response = await realFetch(`${baseUrl}/products/search`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("EMPTY_SEARCH_TERM");
  });
});

describe("response headers", () => {
  it("does not advertise the server framework", async () => {
    // "X-Powered-By: Express" tells an attacker which published vulnerabilities
    // to try first.
    const response = await realFetch(`${baseUrl}/health`);

    expect(response.headers.get("x-powered-by")).toBeNull();
  });

  it("tells browsers not to guess the content type", async () => {
    const response = await realFetch(`${baseUrl}/health`);

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("allows only the configured frontend origin", async () => {
    const response = await realFetch(`${baseUrl}/health`, {
      headers: { Origin: "https://evil.example.com" },
    });

    // The header names the ONE origin we allow. Because that is not
    // evil.example.com, the browser refuses to hand the response to that page.
    // A wildcard "*" here would be the actual bug.
    const allowed = response.headers.get("access-control-allow-origin");

    expect(allowed).not.toBe("*");
    expect(allowed).toBe("http://localhost:3000");
  });
});

describe("unknown routes", () => {
  it("returns a JSON 404 rather than an HTML error page", async () => {
    // An HTML error page from Express includes a stack trace in development.
    const response = await realFetch(`${baseUrl}/definitely-not-a-route`);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
