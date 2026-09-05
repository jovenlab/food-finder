"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  parseLanguage,
  type Language,
} from "@/lib/i18n/translations";

// The manual language selector.
//
// The assignment requires the user to choose explicitly, so there is no
// automatic detection of the browser's language. Auto-detection also tends to
// surprise people: a Dutch speaker on a German laptop gets German with no
// obvious way to change it.
//
// A plain <select> is used rather than a custom dropdown. It is keyboard
// accessible, works on touch, and on a phone opens the native picker - all for
// free, and all things a hand-built dropdown would have to reimplement.

type LanguageSelectorProps = {
  // Called AFTER the language changes, so the page can re-run the current
  // search in the new language.
  //
  // This is a callback rather than a useEffect in the page on purpose. Changing
  // language is a user EVENT, and side effects belonging to an event belong in
  // its handler. Doing it in an effect would mean rendering once, then reacting
  // to our own state change - which React explicitly advises against.
  onLanguageChange?: (language: Language) => void;
};

export function LanguageSelector({ onLanguageChange }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="language"
        className="text-sm text-gray-600 dark:text-gray-400"
      >
        {t("languageLabel")}
      </label>

      <select
        id="language"
        value={language}
        onChange={(event) => {
          // The value comes from our own <option> list, but parsing it keeps
          // the types honest and costs nothing.
          const next = parseLanguage(event.target.value);
          if (!next) return;

          setLanguage(next);

          // Pass the new language explicitly. Reading `language` from context
          // here would still hold the OLD value - React state updates are not
          // visible until the next render.
          onLanguageChange?.(next);
        }}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm
                   outline-none transition focus:border-emerald-500
                   focus:ring-2 focus:ring-emerald-500/30
                   dark:border-gray-700 dark:bg-gray-900"
      >
        {SUPPORTED_LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_NAMES[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
