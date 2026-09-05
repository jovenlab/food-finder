"use client";

import { useState } from "react";

type SearchFormProps = {
  // Called when the user submits. The parent decides what "search" means.
  onSearch: (term: string) => void;

  // Disables the button while a request is in flight, so one click cannot
  // become five.
  isSearching: boolean;
};

export function SearchForm({ onSearch, isSearching }: SearchFormProps) {
  // The text currently in the input box. This is a "controlled input": React
  // holds the value, and the input displays whatever React says. That is why
  // both `value` and `onChange` are needed - remove onChange and the box
  // becomes read-only.
  const [term, setTerm] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // A <form> submission reloads the whole page by default, which would throw
    // away all our React state. preventDefault stops the browser doing that so
    // we can handle the submit ourselves.
    event.preventDefault();
    onSearch(term);
  }

  // Using a real <form> rather than a bare button means the Enter key works and
  // screen readers announce it correctly - both for free.
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="search" className="sr-only">
        Search for a food product
      </label>

      <input
        id="search"
        type="text"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search for a product, e.g. nutella"
        maxLength={100}
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-base
                   outline-none transition focus:border-emerald-500
                   focus:ring-2 focus:ring-emerald-500/30
                   dark:border-gray-700 dark:bg-gray-900"
      />

      <button
        type="submit"
        disabled={isSearching}
        className="rounded-lg bg-emerald-600 px-6 py-2.5 font-medium text-white
                   transition hover:bg-emerald-700
                   disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isSearching ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
