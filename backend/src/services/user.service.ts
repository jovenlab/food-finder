// Finding the demo user.
//
// The assignment specifies a single demo user rather than real accounts, so
// there is no login and no session. Everything the application stores belongs to
// this one row.
//
// Milestone 12 revisits how the demo user is represented. This file is
// deliberately small so that changing that decision means changing one function.

import { prisma } from "../prisma";
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
// Use this where the demo user is genuinely required. The error names the exact
// command to fix it, because "user not found" on a fresh clone is otherwise a
// puzzle.
export async function requireDemoUser(): Promise<User> {
  const user = await findDemoUser();

  if (user === null) {
    throw new Error(
      `Demo user (${DEMO_USER_EMAIL}) not found. Run "npm run db:seed" in the backend folder.`
    );
  }

  return user;
}
