import { prisma } from "../prisma";

// Services hold the actual work. Keeping it out of the controller means this
// function can be called from a test, a script or a webhook - anywhere that has
// no HTTP request to hand.

export type DatabaseHealth =
  | { status: "ok" }
  | { status: "error"; message: string };

// Ask MySQL the cheapest question that exists. If it answers, then the server
// is reachable, the credentials are valid and the connection pool works.
export async function checkDatabase(): Promise<DatabaseHealth> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  } catch (error) {
    // Note that we catch here instead of letting the error escape. A health
    // check exists to REPORT problems, so a failing database must produce a
    // useful answer rather than a 500 that tells the caller nothing.
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
