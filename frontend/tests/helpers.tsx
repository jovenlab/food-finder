// Shared helpers for the component tests.

import { render } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import type { Product } from "@/lib/types";
import type { ReactElement } from "react";

// Renders a component inside the language provider.
//
// Every component that shows text calls `useLanguage()`, which throws without a
// provider above it. Rather than repeating the wrapper in every test, they all
// go through here.
export function renderWithLanguage(ui: ReactElement, language?: "en" | "nl" | "de" | "fr") {
  // The provider reads the stored language when it mounts, so setting it here -
  // before rendering - is how a test chooses which language to render in.
  if (language) {
    window.localStorage.setItem("food-finder-language", language);
  }

  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

// A complete product, with only the fields a test cares about overridden.
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    code: "3017620422003",
    name: "Nutella",
    nameLanguage: "en",
    brand: "Ferrero",
    imageUrl: "https://images.openfoodfacts.org/nutella.jpg",
    quantity: "400 g",
    nutriScore: "e",
    nutritionAvailable: true,
    nutrition: null,
    ...overrides,
  };
}

export const FULL_NUTRITION = {
  energyKcal: 539,
  fat: 30.9,
  saturatedFat: 10.6,
  carbohydrates: 57.5,
  sugars: 56.3,
  fiber: null,
  proteins: 6.3,
  salt: 0.107,
};
