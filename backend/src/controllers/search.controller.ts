import type { Request, Response } from "express";
import { getRecentSearches } from "../services/search.service";
import { serviceUnavailable } from "../errors/AppError";

// Returns the demo user's recent searches so the interface can offer them as
// one-click shortcuts.
//
// Note what this does NOT do: it takes no user id from the request. There is one
// demo user and the backend decides who that is. Letting the browser say which
// user's history to read would be an obvious way to read someone else's data
// once real accounts exist.

export async function getRecentSearchesHandler(_req: Request, res: Response) {
  let searches;

  try {
    searches = await getRecentSearches();
  } catch (error) {
    // Unlike a product search, this endpoint cannot do its job without the
    // database - so it must fail. But a database outage is an expected
    // condition, not a bug in our code, so it deserves 503 rather than 500.
    //
    // This also stops a raw Prisma error - which quotes our file paths and
    // source lines - being handed to the caller.
    console.error("Could not read recent searches:", error);

    throw serviceUnavailable(
      "Recent searches are unavailable because the database cannot be reached.",
      "DATABASE_UNAVAILABLE"
    );
  }

  res.json({
    count: searches.length,
    searches: searches.map((search) => ({
      term: search.term,
      language: search.language,
      // ISO 8601 in UTC. Sending a formatted date would bake our server's
      // timezone and language into the API; the browser knows the user's.
      searchedAt: search.searchedAt.toISOString(),
    })),
  });
}
