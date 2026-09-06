// Tests for the language selector and the translation system.
//
// The assignment requires four languages and a manual selector, so this checks
// both the mechanism (choosing a language changes the interface) and the data
// (no translation is missing or accidentally left in English).

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  SUPPORTED_LANGUAGES,
  translations,
  interpolate,
  parseLanguage,
} from "@/lib/i18n/translations";
import { renderWithLanguage } from "./helpers";

describe("LanguageSelector", () => {
  it("offers exactly the four required languages", () => {
    renderWithLanguage(<LanguageSelector />);

    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Nederlands" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Deutsch" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Français" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("names each language in that language, not in English", () => {
    // A German speaker looking at a Dutch interface must still be able to find
    // their own language.
    renderWithLanguage(<LanguageSelector />, "nl");

    expect(screen.getByRole("option", { name: "Deutsch" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "German" })).not.toBeInTheDocument();
  });

  it("changes the interface when a different language is chosen", async () => {
    // The whole point of the feature, tested end to end through the real
    // provider: pick French, and the label next to the selector becomes French.
    render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>
    );

    expect(screen.getByText("Language")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Language"), "fr");

    expect(screen.getByText("Langue")).toBeInTheDocument();
    expect(screen.queryByText("Language")).not.toBeInTheDocument();
  });

  it("remembers the choice so it survives a reload", async () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>
    );

    await userEvent.selectOptions(screen.getByLabelText("Language"), "de");

    // Persisted outside React, which is what makes it survive a page reload.
    expect(window.localStorage.getItem("food-finder-language")).toBe("de");
  });

  it("tells the page about the change so it can re-run the search", async () => {
    // Product names come from Open Food Facts in the requested language, so
    // switching language has to ask again - otherwise the interface would be in
    // French while the products stayed in English.
    const onLanguageChange = vi.fn();

    render(
      <LanguageProvider>
        <LanguageSelector onLanguageChange={onLanguageChange} />
      </LanguageProvider>
    );

    await userEvent.selectOptions(screen.getByLabelText("Language"), "nl");

    // The NEW language is passed explicitly - reading it from context here would
    // still give the old value, because React state updates are not immediate.
    expect(onLanguageChange).toHaveBeenCalledWith("nl");
  });
});

describe("the translation data itself", () => {
  it("has every key in every language", () => {
    // TypeScript already enforces this at build time. Checking it at runtime too
    // costs nothing and catches a key that was added with an empty string.
    const englishKeys = Object.keys(translations.en).sort();

    for (const language of SUPPORTED_LANGUAGES) {
      expect(Object.keys(translations[language]).sort()).toEqual(englishKeys);
    }
  });

  it("has no blank translations", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      for (const [key, value] of Object.entries(translations[language])) {
        expect(value.trim(), `${language}.${key} is empty`).not.toBe("");
      }
    }
  });

  it("keeps every placeholder intact in every language", () => {
    // "{term}" must survive translation. A translator dropping it would produce
    // a sentence with the search term silently missing.
    for (const key of Object.keys(translations.en) as Array<keyof typeof translations.en>) {
      const placeholdersIn = (text: string) => (text.match(/\{(\w+)\}/g) ?? []).sort();
      const expected = placeholdersIn(translations.en[key]);

      for (const language of SUPPORTED_LANGUAGES) {
        expect(
          placeholdersIn(translations[language][key]),
          `${language}.${key} has different placeholders`
        ).toEqual(expected);
      }
    }
  });
});

describe("interpolate", () => {
  it("substitutes values into a translated sentence", () => {
    expect(interpolate("Found {count} of {total}", { count: 20, total: 94097 })).toBe(
      "Found 20 of 94097"
    );
  });

  it("leaves an unknown placeholder alone rather than printing 'undefined'", () => {
    expect(interpolate("Hello {name}", {})).toBe("Hello {name}");
  });
});

describe("parseLanguage", () => {
  it("accepts the four supported languages, in any case", () => {
    expect(parseLanguage("nl")).toBe("nl");
    expect(parseLanguage("DE")).toBe("de");
  });

  it("rejects anything else", () => {
    // Guards against a stale or hand-edited value in localStorage.
    expect(parseLanguage("es")).toBeNull();
    expect(parseLanguage("")).toBeNull();
    expect(parseLanguage(null)).toBeNull();
    expect(parseLanguage(42)).toBeNull();
  });
});
