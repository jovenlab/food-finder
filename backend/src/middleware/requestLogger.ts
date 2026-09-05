import type { Request, Response, NextFunction } from "express";

// Prints one line per request, so the terminal shows you exactly what the
// frontend asked for and what we answered. This is your first debugging tool
// when the browser says something went wrong.
//
// Example output:
//   GET /health -> 200 (12ms)

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  // The "finish" event fires once the response has been fully sent. That is the
  // only moment we know the final status code and how long the request took.
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`
    );
  });

  // Hand control to the next middleware. Forgetting this single line makes
  // every request hang forever - the most common middleware mistake there is.
  next();
}
