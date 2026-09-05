"use client";

// "use client" marks this file as a Client Component.
//
// Next.js renders components on the SERVER by default, which is fast but has no
// user: there is nobody to click a button and no place to keep state. This page
// has both a form and state, so it must also run in the browser.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  createCheckoutSession,
  fetchMe,
  fetchRecentSearches,
  searchProducts,
} from "@/lib/api";
import { errorCodeOf, errorMessageKey, isRetryable } from "@/lib/errorMessages";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Language, TranslationKey } from "@/lib/i18n/translations";
import type { MeResponse, RecentSearch, SearchResponse } from "@/lib/types";
import { SearchForm } from "@/components/SearchForm";
import { LanguageSelector } from "@/components/LanguageSelector";
import { RecentSearches } from "@/components/RecentSearches";
import { SubscriptionPanel } from "@/components/SubscriptionPanel";
import { CheckoutReturn, type CheckoutOutcome } from "@/components/CheckoutReturn";
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
// Using three separate values (results, error, isSearching) would allow nonsense
// combinations - results AND an error at the same time, or loading AND results.
// With this shape those states cannot be written down, so they cannot happen.
// ---------------------------------------------------------------------------

type SearchState =
  | { status: "idle" }
  | { status: "loading"; term: string }
  | { status: "success"; data: SearchResponse }
  | { status: "empty"; term: string }
  // The error holds a translation KEY, not a sentence, so the message follows
  // the selected language like every other piece of text.
  | { status: "error"; messageKey: TranslationKey; canRetry: boolean };

export default function HomePage() {
  const { language, t } = useLanguage();

  const [state, setState] = useState<SearchState>({ status: "idle" });

  // Lets the "Try again" button - and a language change - repeat the last
  // search without the user retyping it.
  const [lastTerm, setLastTerm] = useState("");

  // Holds the in-flight request so a new search can cancel it.
  //
  // A ref, not state: changing it must NOT re-render the page, and we need to
  // read the current value inside an async function without React's state
  // snapshot getting in the way.
  const inFlightRequest = useRef<AbortController | null>(null);

  // The demo user's previous searches, loaded from MySQL via the backend.
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Fetches the history and quietly gives up if it fails.
  //
  // Recent searches are a convenience. If the backend or database is down the
  // user should see the normal search error once - not a second complaint about
  // a shortcut list they never asked for. So this swallows its errors.
  const refreshRecentSearches = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetchRecentSearches(signal);
      setRecentSearches(response.searches);
    } catch {
      // Leave whatever was already on screen.
    }
  }, []);

  // Load the history once, when the page first appears.
  //
  // Fetching data on mount is what useEffect is FOR: subscribing to something
  // outside React and updating state when it answers. The setState lives inside
  // the `.then` callback rather than the effect body, which is the distinction
  // React draws - a value arriving later is not a cascading render.
  //
  // The cleanup aborts the request if the component unmounts mid-flight, so
  // React never tries to set state on a component that is gone.
  useEffect(() => {
    const controller = new AbortController();

    fetchRecentSearches(controller.signal)
      .then((response) => setRecentSearches(response.searches))
      .catch(() => {
        // A missing shortcut list is not worth telling the user about.
      });

    return () => controller.abort();
  }, []);

  // ---------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------

  const [me, setMe] = useState<MeResponse | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // How the page reports what happened after Stripe sent the user back.
  //   cancelled     - the user backed out; nothing was charged
  //   confirming    - payment taken, waiting for Stripe to tell OUR server
  //   confirmed     - the server now reports an active subscription
  //   stillWaiting  - we gave up polling; the webhook has not arrived yet
  //
  // This lives in page state rather than being read from the URL, because the
  // URL is scrubbed the moment we handle it.
  const [confirmState, setConfirmState] =
    useState<"none" | "cancelled" | "confirming" | "confirmed" | "stillWaiting">("none");

  // Load who we are on mount, same pattern as the search history.
  useEffect(() => {
    const controller = new AbortController();

    fetchMe(controller.signal)
      .then(setMe)
      .catch(() => {
        // Leave `me` as null; the subscription panel simply does not render.
      });

    return () => controller.abort();
  }, []);

  const handleSubscribe = useCallback(async () => {
    setCheckoutError(null);
    setIsStartingCheckout(true);

    try {
      const session = await createCheckoutSession();

      // Leave our site for Stripe's hosted payment page. Card details are
      // entered there, on Stripe's domain - they never touch our server.
      window.location.href = session.url;
    } catch (error) {
      setCheckoutError(
        error instanceof ApiError ? error.message : "Could not start checkout."
      );
      setIsStartingCheckout(false);
    }
    // No `finally`: on success the browser is navigating away, and re-enabling
    // the button would just let someone click it twice on the way out.
  }, []);

  // Called when Stripe sends the browser back to us.
  const handleCheckoutOutcome = useCallback(async (outcome: CheckoutOutcome) => {
    if (outcome === "cancelled") {
      setConfirmState("cancelled");
      return;
    }

    // The user came back from a "successful" Checkout. That is NOT proof of
    // anything: the success URL is just a URL, and anyone can visit it. So we
    // ask OUR server, repeatedly, and only believe it.
    //
    // The server only learns the truth when Stripe sends it a webhook, which is
    // Milestone 15. Until that exists this will poll and then give up - which is
    // the correct behaviour, and exactly why webhooks are needed.
    setConfirmState("confirming");

    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const latest = await fetchMe();
        setMe(latest);

        if (latest.subscription.active) {
          setConfirmState("confirmed");
          return;
        }
      } catch {
        // Ignore one failed poll and try again.
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    setConfirmState("stillWaiting");
  }, []);

  const runSearch = useCallback(
    async (rawTerm: string, searchLanguage: Language) => {
      const term = rawTerm.trim();

      // Catch a blank search before spending a network round trip. The backend
      // rejects it too - that check stays, because the frontend is never the
      // only line of defence - but answering instantly is a better experience.
      if (term === "") {
        setState({
          status: "error",
          messageKey: "errorEmptyTerm",
          canRetry: false,
        });
        return;
      }

      // Cancel whatever was already running.
      //
      // Without this, searching "milk" (slow) then "nutella" (fast) can show
      // nutella's results and then have milk's late reply overwrite them -
      // results that do not match the term on screen. Open Food Facts response
      // times vary between about 0.5 and 20 seconds, so this is a real risk.
      // It also covers switching language mid-search.
      inFlightRequest.current?.abort();

      const controller = new AbortController();
      inFlightRequest.current = controller;

      setLastTerm(term);
      setState({ status: "loading", term });

      try {
        const data = await searchProducts(term, searchLanguage, controller.signal);

        // "Found nothing" is a SUCCESS, not an error. It gets its own state so
        // it can be styled calmly instead of looking like a failure.
        setState(
          data.count === 0 ? { status: "empty", term } : { status: "success", data }
        );

        // The backend has just written this search to MySQL, so reload the list
        // to show it. We ask the server rather than adding it locally: the
        // server owns the ordering and the de-duplication, and guessing here
        // would eventually disagree with what is actually stored.
        void refreshRecentSearches();
      } catch (error) {
        // We cancelled this ourselves because a newer search started. Showing an
        // error here would flash a failure on screen during normal typing.
        if (error instanceof ApiError && error.code === "ABORTED") return;

        setState({
          status: "error",
          messageKey: errorMessageKey(error),
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
    },
    [refreshRecentSearches]
  );

  // The form and the example chips do not know about language; the page supplies
  // the current one.
  const handleSearch = useCallback(
    (term: string) => void runSearch(term, language),
    [runSearch, language]
  );

  // Re-run the current search when the user picks a different language.
  //
  // Product names come from Open Food Facts in the requested language, so
  // switching language must ask again - otherwise the interface would switch to
  // French while the products stayed in English.
  //
  // Note this runs from the selector's change EVENT, not from a useEffect
  // watching `language`. Reacting to a user action is what event handlers are
  // for; an effect would render first and then react to our own state change.
  const handleLanguageChange = useCallback(
    (next: Language) => {
      // Nothing has been searched yet - just switch the interface language.
      if (lastTerm === "") return;

      void runSearch(lastTerm, next);
    },
    [runSearch, lastTerm]
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Food Finder</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t("tagline")}</p>
        </div>

        <LanguageSelector onLanguageChange={handleLanguageChange} />
      </header>

      {/* useSearchParams forces everything up to the nearest Suspense boundary
          to be client-rendered, so the boundary sits tightly around this one
          small component rather than the whole page. */}
      <Suspense fallback={null}>
        <CheckoutReturn onOutcome={handleCheckoutOutcome} />
      </Suspense>

      {confirmState !== "none" && (
        <p
          role="status"
          className={`mb-4 rounded-lg p-3 text-sm ${
            confirmState === "confirmed"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              : confirmState === "cancelled"
                ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          }`}
        >
          {confirmState === "cancelled" && t("checkoutCancelled")}
          {confirmState === "confirming" && t("checkoutConfirming")}
          {confirmState === "confirmed" && t("checkoutConfirmed")}
          {confirmState === "stillWaiting" && t("checkoutStillWaiting")}
        </p>
      )}

      <div className="mb-6">
        <SubscriptionPanel
          me={me}
          onSubscribe={handleSubscribe}
          isStarting={isStartingCheckout}
          errorMessage={checkoutError}
        />
      </div>

      <SearchForm onSearch={handleSearch} isSearching={state.status === "loading"} />

      <RecentSearches searches={recentSearches} onSelect={handleSearch} />

      {/* Exactly one branch below can ever be true, because `status` holds a
          single value. Reading this block tells you every screen the page has. */}
      <section className="mt-8">
        {state.status === "idle" && <InitialPrompt onExample={handleSearch} />}

        {state.status === "loading" && <LoadingSkeleton term={state.term} />}

        {state.status === "empty" && <NoResults term={state.term} />}

        {state.status === "error" && (
          <ErrorPanel
            messageKey={state.messageKey}
            canRetry={state.canRetry}
            onRetry={() => handleSearch(lastTerm)}
          />
        )}

        {state.status === "success" && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {t("showingResults", {
                count: state.data.count,
                // toLocaleString formats numbers the way each language expects:
                // "94,097" in English, "94.097" in German, "94 097" in French.
                total: state.data.totalCount.toLocaleString(language),
                term: state.data.term,
              })}
            </p>
            <ProductList products={state.data.products} />
          </>
        )}
      </section>
    </main>
  );
}
