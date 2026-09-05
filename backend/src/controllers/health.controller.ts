import type { Request, Response } from "express";
import { checkDatabase } from "../services/health.service";

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
  });
}
