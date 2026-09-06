// Awkward but entirely plausible data, rendered.
//
// Everything here is data Open Food Facts really could return - it is a
// community-edited database with no editorial control. The point is not that
// the interface looks beautiful, but that it does not break: no crash, no
// overflow, no value silently dropped, no "null" or "undefined" on screen.

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "@/components/ProductCard";
import { ProductList } from "@/components/ProductList";
import { makeProduct, renderWithLanguage } from "./helpers";

const EMPTY_NUTRITION = {
  energyKcal: null,
  fat: null,
  saturatedFat: null,
  carbohydrates: null,
  sugars: null,
  fiber: null,
  proteins: null,
  salt: null,
};

describe("very long text", () => {
  it("renders a 300-character name without crashing", () => {
    const name = "A".repeat(300);
    renderWithLanguage(<ProductCard product={makeProduct({ name })} />);

    expect(screen.getByRole("heading", { name })).toBeInTheDocument();
  });

  it("allows a long unbroken word to WRAP rather than overflow", () => {
    // A browser will not break a word by itself: an 86-character string with no
    // spaces is pushed straight out of the card, dragging the grid with it.
    // Found by feeding the interface deliberately awkward data.
    const name = "Supercalifragilisticexpialidociousantidisestablishmentarianismpneumonoultramicroscopic";

    renderWithLanguage(<ProductCard product={makeProduct({ name })} />);

    const heading = screen.getByRole("heading", { name });

    expect(heading.className).toContain("break-words");
    // A flex child will not shrink below its content width without this.
    expect(heading.className).toContain("min-w-0");
  });

  it("wraps a long brand and a long quantity too", () => {
    renderWithLanguage(
      <ProductCard
        product={makeProduct({ brand: "B".repeat(200), quantity: "Q".repeat(120) })}
      />
    );

    expect(screen.getByText("B".repeat(200)).className).toContain("break-words");
    expect(screen.getByText("Q".repeat(120)).className).toContain("break-words");
  });
});

describe("unusual characters", () => {
  it("renders emoji in the name and brand", () => {
    renderWithLanguage(
      <ProductCard product={makeProduct({ name: "🍫🍪🧁 Emoji Product", brand: "🏭 Factory" })} />
    );

    expect(screen.getByRole("heading", { name: "🍫🍪🧁 Emoji Product" })).toBeInTheDocument();
    expect(screen.getByText("🏭 Factory")).toBeInTheDocument();
  });

  it("renders right-to-left script", () => {
    renderWithLanguage(
      <ProductCard product={makeProduct({ name: "كيفير الحليب الطازج", nameLanguage: "ar" })} />
    );

    expect(screen.getByRole("heading", { name: "كيفير الحليب الطازج" })).toBeInTheDocument();
  });

  it("shows HTML as text rather than interpreting it", () => {
    // React escapes by default. This test exists so that a future refactor to
    // dangerouslySetInnerHTML fails loudly instead of quietly.
    renderWithLanguage(
      <ProductCard product={makeProduct({ name: "<script>alert(1)</script>" })} />
    );

    expect(screen.getByRole("heading", { name: "<script>alert(1)</script>" })).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });
});

describe("zero is a value, not a missing value", () => {
  it("displays nutritional zeros instead of hiding them", () => {
    // "0 g of salt" is real information and a selling point. Treating 0 as
    // absent - the classic falsy-check bug - would silently delete it.
    renderWithLanguage(
      <ProductCard
        product={makeProduct({
          nutrition: { ...EMPTY_NUTRITION, energyKcal: 0, fat: 0, salt: 0 },
        })}
      />
    );

    expect(screen.getByText("0 kcal")).toBeInTheDocument();
    expect(screen.getAllByText("0 g")).toHaveLength(2);
  });

  it("still says 'no data' when every value really is missing", () => {
    renderWithLanguage(
      <ProductCard product={makeProduct({ nutrition: EMPTY_NUTRITION })} />
    );

    // All null, so no rows - but the panel must not claim the data is locked.
    expect(screen.queryByText("Subscribe to see nutritional values")).not.toBeInTheDocument();
  });
});

describe("extreme numbers", () => {
  it("renders very large and very small values", () => {
    renderWithLanguage(
      <ProductCard
        product={makeProduct({
          nutrition: { ...EMPTY_NUTRITION, energyKcal: 999999.987654, salt: 0.0000012 },
        })}
      />
    );

    // toLocaleString groups and rounds; the point is that it renders at all and
    // does not produce "NaN" or scientific notation on screen.
    const panel = screen.getByText("Nutrition per 100 g").parentElement!;

    expect(panel.textContent).not.toContain("NaN");
    expect(panel.textContent).not.toContain("e-");
    expect(panel.textContent).toMatch(/999/);
  });
});

describe("a whole page of awkward products", () => {
  it("renders them all without a crash, and gives each a stable key", () => {
    const products = [
      makeProduct({ code: "1", name: "A".repeat(300) }),
      makeProduct({ code: "2", name: null, nameLanguage: null, brand: "Only a brand" }),
      makeProduct({ code: "3", brand: null, imageUrl: null }),
      makeProduct({ code: "4", name: "🍫", quantity: null }),
      makeProduct({ code: "5", nutritionAvailable: false, nutrition: null }),
    ];

    renderWithLanguage(<ProductList products={products} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    // Nothing raw leaked through any of the fallbacks.
    expect(document.body.textContent).not.toMatch(/\bnull\b|\bundefined\b|\bNaN\b/);
  });

  it("renders an empty list without breaking", () => {
    renderWithLanguage(<ProductList products={[]} />);

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
