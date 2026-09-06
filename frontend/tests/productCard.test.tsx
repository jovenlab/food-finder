// Tests for how a single product is displayed.
//
// Two things are checked here, and both matter:
//
//   1. Incomplete Open Food Facts data must not break the card. About one in
//      five real results is missing something.
//   2. The nutrition panel must show values ONLY when the backend sent them -
//      the visible half of the access rule.

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "@/components/ProductCard";
import { FULL_NUTRITION, makeProduct, renderWithLanguage } from "./helpers";

describe("ProductCard - complete data", () => {
  it("shows the name, brand and quantity", () => {
    renderWithLanguage(<ProductCard product={makeProduct()} />);

    expect(screen.getByRole("heading", { name: "Nutella" })).toBeInTheDocument();
    expect(screen.getByText("Ferrero")).toBeInTheDocument();
    expect(screen.getByText("400 g")).toBeInTheDocument();
  });

  it("uses the product name as the image's alt text", () => {
    renderWithLanguage(<ProductCard product={makeProduct()} />);

    expect(screen.getByAltText("Nutella")).toBeInTheDocument();
  });
});

describe("ProductCard - incomplete data", () => {
  it("shows a placeholder instead of a blank heading when the name is missing", () => {
    renderWithLanguage(
      <ProductCard product={makeProduct({ name: null, nameLanguage: null })} />
    );

    expect(screen.getByText("Name not available")).toBeInTheDocument();
    // The word "null" must never reach the screen.
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
  });

  it("omits the brand line entirely rather than leaving a gap", () => {
    renderWithLanguage(<ProductCard product={makeProduct({ brand: null })} />);

    expect(screen.queryByText("Ferrero")).not.toBeInTheDocument();
    // The rest of the card still renders.
    expect(screen.getByRole("heading", { name: "Nutella" })).toBeInTheDocument();
  });

  it("shows a 'No image' placeholder when there is no photo", () => {
    renderWithLanguage(<ProductCard product={makeProduct({ imageUrl: null })} />);

    expect(screen.getByText("No image")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("marks a name that is not in the selected language", () => {
    // Asking for Dutch and getting French is common. Presenting it as a Dutch
    // translation would be a lie, so the card labels it.
    renderWithLanguage(
      <ProductCard product={makeProduct({ name: "Chocolat noir", nameLanguage: "fr" })} />,
      "nl"
    );

    expect(
      screen.getByTitle("Dit product heeft geen naam in de geselecteerde taal.")
    ).toBeInTheDocument();
  });

  it("does NOT mark a name that IS in the selected language", () => {
    renderWithLanguage(
      <ProductCard product={makeProduct({ name: "Chocolade", nameLanguage: "nl" })} />,
      "nl"
    );

    expect(
      screen.queryByTitle("Dit product heeft geen naam in de geselecteerde taal.")
    ).not.toBeInTheDocument();
  });
});

describe("ProductCard - nutritional information", () => {
  it("shows the values when the backend sent them", () => {
    renderWithLanguage(
      <ProductCard product={makeProduct({ nutrition: FULL_NUTRITION })} />
    );

    expect(screen.getByText("Nutrition per 100 g")).toBeInTheDocument();
    expect(screen.getByText("539 kcal")).toBeInTheDocument();
    expect(screen.getByText("30.9 g")).toBeInTheDocument();
  });

  it("invites the user to subscribe when data exists but was withheld", () => {
    // nutritionAvailable true, nutrition null - the backend refused.
    renderWithLanguage(
      <ProductCard product={makeProduct({ nutritionAvailable: true, nutrition: null })} />
    );

    expect(screen.getByText("Subscribe to see nutritional values")).toBeInTheDocument();
    // And crucially, no numbers.
    expect(screen.queryByText(/kcal/)).not.toBeInTheDocument();
  });

  it("says there is no data, rather than offering a subscription, when none exists", () => {
    // Offering to sell access to values that do not exist would be dishonest.
    renderWithLanguage(
      <ProductCard product={makeProduct({ nutritionAvailable: false, nutrition: null })} />
    );

    expect(screen.getByText("No nutritional data available")).toBeInTheDocument();
    expect(screen.queryByText("Subscribe to see nutritional values")).not.toBeInTheDocument();
  });

  it("skips individual values that are missing", () => {
    // FULL_NUTRITION has fiber: null. The row should be absent, not shown as a dash.
    renderWithLanguage(
      <ProductCard product={makeProduct({ nutrition: FULL_NUTRITION })} />
    );

    expect(screen.queryByText("Fibre")).not.toBeInTheDocument();
    expect(screen.getByText("Protein")).toBeInTheDocument();
  });

  it("formats numbers for the selected language", () => {
    // 30.9 in English is 30,9 in Dutch. Getting this wrong looks unprofessional
    // to anyone outside the English-speaking world.
    renderWithLanguage(
      <ProductCard product={makeProduct({ nutrition: FULL_NUTRITION })} />,
      "nl"
    );

    expect(screen.getByText("30,9 g")).toBeInTheDocument();
  });
});
