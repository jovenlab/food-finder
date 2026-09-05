"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { RecentSearch } from "@/lib/types";

// The demo user's previous searches, as one-click shortcuts.
//
// This is the visible payoff for storing searches in MySQL. Without it the table
// would fill up with rows nobody ever reads.

export function RecentSearches({
  searches,
  onSelect,
}: {
  searches: RecentSearch[];
  onSelect: (term: string) => void;
}) {
  const { language, t } = useLanguage();

  // Nothing searched yet - render nothing rather than an empty labelled box.
  if (searches.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500">{t("recentSearches")}</span>

      {searches.map((search) => (
        <button
          key={search.term}
          type="button"
          onClick={() => onSelect(search.term)}
          // The backend sends a raw ISO timestamp; the browser knows the reader's
          // timezone and formatting conventions, so the date is formatted HERE.
          // The same instant reads as "5-9-2026 12:15" in Dutch and "9/5/2026,
          // 12:15 PM" in English.
          title={new Date(search.searchedAt).toLocaleString(language)}
          className="rounded-full border border-gray-300 px-3 py-1 text-sm
                     transition hover:border-emerald-500 hover:text-emerald-600
                     dark:border-gray-700"
        >
          {search.term}
        </button>
      ))}
    </div>
  );
}
