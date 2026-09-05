"use client";

// Makes the selected language, and the translate function, available to every
// component - without passing them down through every layer as props.
//
// "Context" is React's tool for exactly this: a value that many components at
// different depths need. Without it, `page.tsx` would have to hand `language`
// to ProductList, which hands it to ProductCard, which hands it to
// ProductImage - a chain of props nobody in the middle actually uses.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_LANGUAGE,
  interpolate,
  parseLanguage,
  translations,
  type Language,
  type TranslationKey,
} from "./translations";

// ---------------------------------------------------------------------------
// The stored preference, treated as what it actually is: a value that lives
// OUTSIDE React, in the browser.
//
// The obvious approach - useState plus a useEffect that reads localStorage - has
// two problems. It renders once with the wrong language and then again with the
// right one (a "cascading render"), and it does not notice the same site being
// changed in another tab. React provides useSyncExternalStore for precisely this
// situation, so we use it.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "food-finder-language";

// Everyone who wants to know when the language changes.
const listeners = new Set<() => void>();

// useSyncExternalStore calls getSnapshot on every render and compares the
// result. Re-reading localStorage each time would work (a string compares by
// value) but is wasteful, so we remember it and clear the cache on a change.
let cachedLanguage: Language | null = null;

function readStoredLanguage(): Language {
  try {
    return parseLanguage(window.localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_LANGUAGE;
  } catch {
    // Reading localStorage throws outright when site data is blocked.
    return DEFAULT_LANGUAGE;
  }
}

function getSnapshot(): Language {
  if (cachedLanguage === null) cachedLanguage = readStoredLanguage();
  return cachedLanguage;
}

// What the SERVER should assume. There is no localStorage during server
// rendering, so it renders the default; React then swaps in the real value after
// hydration without complaining about a mismatch. This is the whole reason
// useSyncExternalStore takes a third argument.
function getServerSnapshot(): Language {
  return DEFAULT_LANGUAGE;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  // The browser fires "storage" when ANOTHER tab changes localStorage, so two
  // open tabs stay in step. It does not fire in the tab that made the change,
  // which is why writeLanguage notifies listeners itself.
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedLanguage = null;
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function writeLanguage(next: Language) {
  cachedLanguage = next;

  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage unavailable - the choice still applies for this visit.
  }

  listeners.forEach((listener) => listener());
}

// ---------------------------------------------------------------------------
// The context itself.
// ---------------------------------------------------------------------------

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  // `t` for "translate" - the conventional name in i18n code.
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Keep the <html lang="…"> attribute in step with the choice.
  //
  // This IS a correct use of useEffect: pushing React state out to an external
  // system (the DOM). It is not decoration either - screen readers use it to
  // pick the right pronunciation, and browsers use it to offer translation.
  // Leaving it as "en" on a French page is a real accessibility bug.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      interpolate(translations[language][key], values),
    [language]
  );

  // useMemo stops this object being rebuilt on every render, which would make
  // every component using the context re-render for no reason.
  const value = useMemo(
    () => ({ language, setLanguage: writeLanguage, t }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// The hook components actually call.
//
// Throwing when the provider is missing turns a confusing "cannot read property
// of null" deep inside a component into a message naming the real mistake.
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (context === null) {
    throw new Error("useLanguage must be used inside a <LanguageProvider>.");
  }

  return context;
}
