// Runs work that needs the database, and turns a connection failure into an
// honest answer.
//
// Three controllers needed the same eight lines, and a fourth was missed - which
// is exactly how duplicated error handling goes wrong. `POST /checkout/session`
// with MySQL unreachable answered:
//
//   500 INTERNAL_ERROR
//   "Invalid `prisma.user.findUnique()` invocation in D:\...\user.service.ts:24"
//
// Two things wrong with that. 500 means "a bug in our code", but the database
// being down is an expected operational condition, not a bug. And the message
// quotes our file paths and query internals straight back to the caller.

import { AppError, serviceUnavailable } from "./AppError";

// `what` names the thing the caller wanted, so the message reads naturally:
//   withDatabase("Recent searches", ...)  ->  "Recent searches are unavailable…"
export async function withDatabase<T>(what: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    // Errors we raised deliberately already say the right thing at the right
    // status - a missing demo user, for instance - so let them through.
    if (error instanceof AppError) throw error;

    // The real reason goes to the log, where only we can read it.
    console.error(`Database unavailable while handling "${what}":`, error);

    throw serviceUnavailable(
      `${what} is unavailable because the database cannot be reached.`,
      "DATABASE_UNAVAILABLE"
    );
  }
}
