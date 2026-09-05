import type { Request, Response } from "express";
import { checkDatabase } from "../services/health.service";
import { describeStripeConfig } from "../stripe";

// A controller translates between HTTP and our application logic:
//   read what the request wants -> call a service -> shape the response.
//
// It contains no SQL and no business rules of its own. That is what keeps it
// short enough to read in one go.

export async function getHealth(_req: Request, res: Response) {
  const database = await checkDatabase();

  // If MySQL is unreachable the server is running but cannot do its job, so we
  // answer 503 Service Unavailable rather than 200 OK. That lets a monitoring
  // tool - or our own frontend - tell "alive" apart from "alive and working".
  const httpStatus = database.status === "ok" ? 200 : 503;

  res.status(httpStatus).json({
    status: database.status === "ok" ? "ok" : "degraded",
    service: "food-finder-backend",
    timestamp: new Date().toISOString(),
    database,
    // Informational only - it reports whether Stripe is set up, and does NOT
    // affect the status code. Search, translations and history all work without
    // Stripe, so a missing Stripe key is not an unhealthy server.
    //
    // This reports booleans and a mode, never the key itself.
    stripe: describeStripeConfig(),
  });
}
