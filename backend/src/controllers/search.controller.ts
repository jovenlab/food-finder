import type { Request, Response } from "express";
import { getRecentSearches } from "../services/search.service";
import { withDatabase } from "../errors/withDatabase";

// Returns the demo user's recent searches so the interface can offer them as
// one-click shortcuts.
//
// Note what this does NOT do: it takes no user id from the request. There is one
// demo user and the backend decides who that is. Letting the browser say which
// user's history to read would be an obvious way to read someone else's data
// once real accounts exist.

export async function getRecentSearchesHandler(_req: Request, res: Response) {
  const searches = await withDatabase("Search history", getRecentSearches);

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
