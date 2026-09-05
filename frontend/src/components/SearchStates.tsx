"use client";

// The four screens that are NOT a list of products.
//
// They live together in one file so you can compare them side by side: each one
// answers "what should the user see, and what should they do next?" for a
// different outcome of the same request.

// ---------------------------------------------------------------------------
// 1. Idle - nothing searched yet.
//
// A blank page looks broken. This says what the app is for and gives the user a
// first move, which is especially useful because Open Food Facts returns nothing
// for many plausible searches.
// ---------------------------------------------------------------------------

const EXAMPLE_SEARCHES = ["nutella", "chocolate", "yoghurt", "olive oil"];

export function InitialPrompt({ onExample }: { onExample: (term: string) => void }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
      <p className="text-gray-600 dark:text-gray-400">
        Search for a packaged food product to see its name, brand and photo.
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <span className="text-sm text-gray-500">Try:</span>
        {EXAMPLE_SEARCHES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onExample(example)}
            className="rounded-full border border-gray-300 px-3 py-1 text-sm
                       transition hover:border-emerald-500 hover:text-emerald-600
                       dark:border-gray-700"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Loading.
//
// We show skeleton cards rather than a spinner. A spinner says "something is
// happening"; skeletons also say WHAT is coming and roughly how much, and
// because they are the same size as real cards the page does not jump when the
// results replace them.
// ---------------------------------------------------------------------------

export function LoadingSkeleton({ term }: { term: string }) {
  return (
    <div>
      {/* aria-live="polite" makes a screen reader announce this without
          interrupting whatever the user is doing. Sighted users see the
          skeletons; this is the equivalent for everyone else. */}
      <p className="mb-4 text-sm text-gray-500" aria-live="polite">
        Searching for &ldquo;{term}&rdquo;…
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Six placeholders is enough to fill the visible area without
            pretending we know the real result count. */}
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-xl border border-gray-200 p-4 dark:border-gray-800"
          >
            <div className="h-40 w-full rounded-md bg-gray-200 dark:bg-gray-800" />
            <div className="mt-3 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Empty - the search worked, there was simply nothing to find.
//
// This must NOT look like an error. Nothing is broken and retrying the same
// term will return nothing again, so we suggest changing the term instead.
// ---------------------------------------------------------------------------

export function NoResults({ term }: { term: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-8 text-center dark:border-gray-800">
      <p className="font-medium">No products found for &ldquo;{term}&rdquo;.</p>
      <p className="mt-2 text-sm text-gray-500">
        Try a different spelling, a brand name, or a more general word.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Error.
//
// Two things matter here: say what happened in plain language, and only offer
// "Try again" when trying again could actually help. A retry button that always
// fails is worse than no button.
// ---------------------------------------------------------------------------

export function ErrorPanel({
  message,
  canRetry,
  onRetry,
}: {
  message: string;
  canRetry: boolean;
  onRetry: () => void;
}) {
  return (
    // role="alert" tells assistive technology to announce this immediately,
    // which is right for a failure the user needs to know about now.
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-6
                 dark:border-red-900 dark:bg-red-950/40"
    >
      <p className="font-medium text-red-800 dark:text-red-200">{message}</p>

      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white
                     transition hover:bg-red-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}
