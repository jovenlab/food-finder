"use client";

// "use client" marks this file as a Client Component.
//
// Next.js renders components on the SERVER by default, which is fast but has no
// user: there is nobody to click a button and no place to keep state. This page
// has both a form and state, so it must also run in the browser.

import { useCallback, useRef, useState } from "react";
import { ApiError, searchProducts } from "@/lib/api";
import { errorCodeOf, friendlyErrorMessage, isRetryable } from "@/lib/errorMessages";
import type { SearchResponse } from "@/lib/types";
import { SearchForm } from "@/components/SearchForm";
import { ProductList } from "@/components/ProductList";
import {
  ErrorPanel,
  InitialPrompt,
  LoadingSkeleton,
  NoResults,
} from "@/components/SearchStates";

// ---------------------------------------------------------------------------
// One variable describes the entire screen.
//
// This is a "discriminated union": every option has a `status` field, and
// TypeScript uses it to know which other fields exist. Checking
// `state.status === "success"` is what makes `state.data` available.
//
// The previous version used three separate values (results, error, isSearching)
// which allowed nonsense combinations - results AND an error at the same time,
// or loading AND results. With this shape those states cannot be written down,
// so they cannot happen.
// ---------------------------------------------------------------------------

type SearchState =
  | { status: "idle" }
  | { status: "loading"; term: string }
  | { status: "success"; data: SearchResponse }
  | { status: "empty"; term: string }
  | { status: "error"; message: string; canRetry: boolean };

export default function HomePage() {
  const [state, setState] = useState<SearchState>({ status: "idle" });

  // Lets the "Try again" button repeat the last search without the user
  // retyping it.
  const [lastTerm, setLastTerm] = useState("");

  // Holds the in-flight request so a new search can cancel it.
  //
  // A ref, not state: changing it must NOT re-render the page, and we need to
  // read the current value inside an async function without React's state
  // snapshot getting in the way.
  const inFlightRequest = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (rawTerm: string) => {
    const term = rawTerm.trim();

    // Catch a blank search before spending a network round trip. The backend
    // rejects it too - that check stays, because the frontend is never the only
    // line of defence - but answering instantly is a better experience.
    if (term === "") {
      setState({
        status: "error",
        message: "Please enter something to search for.",
        canRetry: false,
      });
      return;
    }

    // Cancel whatever was already running.
    //
    // Without this, searching "milk" (slow) then "nutella" (fast) can show
    // nutella's results and then have milk's late reply overwrite them - results
    // that do not match the term on screen. Open Food Facts response times vary
    // between about 3 and 20 seconds, so this is a real risk, not a theoretical
    // one.
    inFlightRequest.current?.abort();

    const controller = new AbortController();
    inFlightRequest.current = controller;

    setLastTerm(term);
    setState({ status: "loading", term });

    try {
      const data = await searchProducts(term, "en", controller.signal);

      // "Found nothing" is a SUCCESS, not an error. It gets its own state so it
      // can be styled calmly instead of looking like a failure.
      setState(
        data.count === 0 ? { status: "empty", term } : { status: "success", data }
      );
    } catch (error) {
      // We cancelled this ourselves because a newer search started. Showing an
      // error here would flash a failure on screen during normal typing.
      if (error instanceof ApiError && error.code === "ABORTED") return;

      setState({
        status: "error",
        message: friendlyErrorMessage(error),
        canRetry: isRetryable(error),
      });

      // The friendly message hides the technical detail from the user, but we
      // still want it in the console when debugging.
      console.error(`Search failed [${errorCodeOf(error)}]`, error);
    } finally {
      // Only clear the ref if THIS request is still the current one. A newer
      // search may already have replaced it.
      if (inFlightRequest.current === controller) {
        inFlightRequest.current = null;
      }
    }
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Food Finder</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Search packaged food products from Open Food Facts.
        </p>
      </header>

      <SearchForm onSearch={runSearch} isSearching={state.status === "loading"} />

      {/* Exactly one branch below can ever be true, because `status` holds a
          single value. Reading this block tells you every screen the page has. */}
      <section className="mt-8">
        {state.status === "idle" && <InitialPrompt onExample={runSearch} />}

        {state.status === "loading" && <LoadingSkeleton term={state.term} />}

        {state.status === "empty" && <NoResults term={state.term} />}

        {state.status === "error" && (
          <ErrorPanel
            message={state.message}
            canRetry={state.canRetry}
            onRetry={() => runSearch(lastTerm)}
          />
        )}

        {state.status === "success" && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              Showing {state.data.count} of{" "}
              {state.data.totalCount.toLocaleString()} matches for &ldquo;
              {state.data.term}&rdquo;.
            </p>
            <ProductList products={state.data.products} />
          </>
        )}
      </section>
    </main>
  );
}
