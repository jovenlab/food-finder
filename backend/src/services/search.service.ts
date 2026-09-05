// Storing and reading the demo user's recent searches.
//
// This is the only part of the application whose data WE own. Products are
// borrowed from Open Food Facts on every request; searches are ours, and they
// live in MySQL.
//
//   Application  ->  Prisma  ->  MySQL
//                                  ^
//                            MySQL Workbench (for inspecting by hand)

import { prisma } from "../prisma";
import { requireDemoUser } from "./user.service";
import type { Language } from "../types/product";

// How many recent searches we hand back for display.
const RECENT_LIMIT = 8;

// How many rows we read in order to produce those. We over-fetch because the
// same term searched repeatedly should appear once, and duplicates are removed
// after reading.
const RECENT_SCAN_SIZE = 50;

export type RecentSearch = {
  term: string;
  language: string;
  searchedAt: Date;
};

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

// Appends one row to the Search table.
//
// Append-only on purpose: every search is a separate row, which keeps this an
// honest log of what happened and when. Updating a single row per term instead
// would lose the history and make "recent searches" harder to reason about.
// Duplicates are collapsed when READING, where it is a display concern.
export async function recordSearch(term: string, language: Language) {
  const user = await requireDemoUser();

  return prisma.search.create({
    data: {
      term,
      language,
      userId: user.id,
    },
  });
}

// The version the request path actually calls.
//
// Logging a search is a SECONDARY concern. If MySQL is down, the user must still
// get their products - failing the whole request because we could not write a
// history row would be a much worse outcome than losing that row.
//
// So this function never throws. It reports the problem to the server log, where
// we can see it, and lets the request continue.
export async function recordSearchSafely(term: string, language: Language) {
  try {
    await recordSearch(term, language);
  } catch (error) {
    console.error("Could not record search (continuing anyway):", error);
  }
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

// The demo user's most recent searches, newest first, without duplicates.
//
// The query is served by the @@index([userId, createdAt]) we created in
// Milestone 4: MySQL can walk that index backwards instead of sorting the whole
// table, which is exactly the question we are asking it.
export async function getRecentSearches(): Promise<RecentSearch[]> {
  const user = await requireDemoUser();

  const rows = await prisma.search.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: RECENT_SCAN_SIZE,
    select: { term: true, language: true, createdAt: true },
  });

  // Collapse repeats, keeping the most recent occurrence.
  //
  // We compare on the TERM ONLY, ignoring language. Searching "chocolate" in
  // English and again in Dutch is two rows in the table - correctly, they are
  // two different searches - but showing the user two identical "chocolate"
  // chips would just look like a bug.
  //
  // Comparing lowercased means "Nutella" and "nutella" count as the same search,
  // which is what a person would expect, while the stored rows keep whatever
  // spelling was actually typed.
  const seen = new Set<string>();
  const unique: RecentSearch[] = [];

  for (const row of rows) {
    const key = row.term.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    unique.push({
      term: row.term,
      language: row.language,
      searchedAt: row.createdAt,
    });

    if (unique.length === RECENT_LIMIT) break;
  }

  return unique;
}
