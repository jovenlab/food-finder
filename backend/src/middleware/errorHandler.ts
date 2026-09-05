import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { isProduction } from "../config/env";

// Runs when no route matched the URL. Mounted AFTER all routes in app.ts,
// because Express tries middleware in the order it was registered - put this
// first and it would swallow every request before any route could handle it.
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

// Express and its built-in middleware throw errors that already carry the right
// status code. The clearest example: send a malformed JSON body and
// express.json() throws an error with statusCode 400 and expose: true.
//
// `expose: true` is the standard flag meaning "this message is safe to show the
// client". Without this check, a user's typo would be reported as a 500 Internal
// Server Error, which wrongly blames our server for the caller's mistake.
//
// We trust the status only for 4xx errors: a 5xx from a library is still a
// server fault whose message we should hide.
function asClientError(
  error: unknown
): { statusCode: number; message: string } | null {
  if (typeof error !== "object" || error === null) return null;

  const candidate = error as { statusCode?: unknown; expose?: unknown; message?: unknown };

  if (
    typeof candidate.statusCode === "number" &&
    candidate.statusCode >= 400 &&
    candidate.statusCode < 500 &&
    candidate.expose === true &&
    typeof candidate.message === "string"
  ) {
    return { statusCode: candidate.statusCode, message: candidate.message };
  }

  return null;
}

// The central error handler: every error thrown anywhere in the application
// ends up here, so error responses have one consistent shape.
//
// Express recognises this as an error handler purely because it takes FOUR
// arguments. Delete the unused `_next` parameter and Express silently treats it
// as an ordinary middleware and never calls it - a genuinely baffling bug.
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Errors we threw on purpose already know their status code and are safe to
  // show to the user. These are expected, so we log them briefly.
  if (error instanceof AppError) {
    console.warn(`Handled error ${error.statusCode}: ${error.message}`);
    res.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  // A bad request from the caller, reported by Express itself.
  const clientError = asClientError(error);
  if (clientError) {
    console.warn(`Bad request ${clientError.statusCode}: ${clientError.message}`);
    res.status(clientError.statusCode).json({
      error: { code: "BAD_REQUEST", message: clientError.message },
    });
    return;
  }

  // Anything else is an unexpected bug. Log it in full - this is the stack trace
  // you will actually need - but do not send the message to the client in
  // production: internal errors can leak table names, file paths, even
  // connection strings. In development we do show it, because you need to debug.
  console.error("Unexpected error:", error);

  const message = isProduction
    ? "Something went wrong."
    : error instanceof Error
      ? error.message
      : "Unknown error";

  res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
}
