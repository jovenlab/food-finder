// IDENTITY: who the application thinks the user is.
//
// The assignment specifies a single demo user rather than real accounts, so
// there is no login, no password, no session and no token. There is exactly one
// row in `User`, created by prisma/seed.ts and found here by a constant email.
//
// The important property is that the BACKEND decides who the user is. No
// endpoint accepts a user id from the browser. That keeps things simple today
// and, more importantly, means there is no request parameter to tamper with the
// day real accounts are added.
//
// Identity is only the first of three separate concerns:
//   identity      -> here
//   subscription  -> subscription.service.ts  (what Stripe says)
//   access        -> access.service.ts        (what our rules allow)

import { prisma } from "../prisma";
import { serviceUnavailable } from "../errors/AppError";
import type { User } from "../generated/prisma/client";

// The email that identifies the demo user. It must match prisma/seed.ts - that
// script creates the row, this function finds it.
export const DEMO_USER_EMAIL = "demo@foodfinder.local";

// Returns the demo user, or null if the database has not been seeded.
//
// We look it up on every call instead of caching the id in memory. The lookup
// uses a unique index so it is very fast, and a cache would go stale the moment
// someone reset or reseeded the database during development - a confusing bug to
// chase for no measurable gain.
export async function findDemoUser(): Promise<User | null> {
  return prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
}

// Same, but insists the user exists.
//
// Use this where the demo user is genuinely required.
//
// A missing demo user means the database was never seeded - a setup problem, not
// a bug in our code - so this is a 503 with a message naming the exact command
// to fix it. "User not found" on a fresh clone is otherwise a real puzzle.
export async function requireDemoUser(): Promise<User> {
  const user = await findDemoUser();

  if (user === null) {
    throw serviceUnavailable(
      `Demo user (${DEMO_USER_EMAIL}) not found. Run "npm run db:seed" in the backend folder.`,
      "DEMO_USER_MISSING"
    );
  }

  return user;
}
