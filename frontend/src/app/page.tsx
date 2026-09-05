"use client";

// "use client" marks this file as a Client Component.
//
// Next.js renders components on the SERVER by default, which is fast but has no
// user: there is nobody to click a button and no place to keep state. This page
// has both a form and state, so it must also run in the browser.

import { useState } from "react";
import { ApiError, searchProducts } from "@/lib/api";
import type { SearchResponse } from "@/lib/types";
import { SearchForm } from "@/components/SearchForm";
import { ProductList } from "@/components/ProductList";

export default function HomePage() {
  // All the page's state lives here, in one place. The child components receive
  // what they need as props and keep no state of their own, so there is exactly
  // one answer to "what is currently on screen?".
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(term: string) {
    // Clear the previous outcome before starting, otherwise old results would
    // sit on screen next to a new error - or vice versa.
    setErrorMessage(null);
    setIsSearching(true);

    try {
      const response = await searchProducts(term);
      setResults(response);
    } catch (error) {
      // ApiError is the type our api.ts throws, and its message is already
      // written for a human. Anything else is unexpected.
      setErrorMessage(
        error instanceof ApiError ? error.message : "Something went wrong."
      );
      setResults(null);
    } finally {
      // `finally` runs whether we succeeded or failed, so the button can never
      // get stuck saying "Searching…".
      setIsSearching(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Food Finder</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Search packaged food products from Open Food Facts.
        </p>
      </header>

      <SearchForm onSearch={handleSearch} isSearching={isSearching} />

      <section className="mt-8">
        {/* These three states get proper treatment in Milestone 9. For now they
            are plain messages - enough that the page is never blank or broken. */}

        {errorMessage && (
          <p className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
          </p>
        )}

        {results && results.count === 0 && !errorMessage && (
          <p className="text-gray-600 dark:text-gray-400">
            No products found for &ldquo;{results.term}&rdquo;.
          </p>
        )}

        {results && results.count > 0 && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              Showing {results.count} of {results.totalCount.toLocaleString()} matches
              for &ldquo;{results.term}&rdquo;.
            </p>
            <ProductList products={results.products} />
          </>
        )}
      </section>
    </main>
  );
}
