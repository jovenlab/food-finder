import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { requestLogger } from "./middleware/requestLogger";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

// Builds the Express application WITHOUT starting a server.
//
// Splitting "build the app" from "start the server" (index.ts) is what makes
// automated testing possible in Milestone 18: a test can create an app and send
// requests straight into it, with no network port and no port conflicts.

export function createApp() {
  const app = express();

  // ---------------------------------------------------------------------
  // Middleware. Express runs these in the order they are registered, so the
  // order below is literally the order every request travels through.
  // ---------------------------------------------------------------------

  // Logging goes FIRST so that every request produces a log line - including
  // ones that fail before reaching a route. Registering it after express.json()
  // means a malformed JSON body skips the logger entirely, because the parser
  // jumps straight to the error handler. The request you most want to see would
  // be the one request that never appears in your terminal.
  app.use(requestLogger);

  // Browsers block a page on localhost:3000 from calling localhost:4000 unless
  // the server explicitly allows that origin. This is CORS.
  app.use(cors({ origin: env.frontendOrigin }));

  // Turn a JSON request body into a JavaScript object on `req.body`.
  // If the body is not valid JSON this throws, and our error handler turns it
  // into a 400 Bad Request.
  app.use(express.json());

  // ---------------------------------------------------------------------
  // Routes.
  // ---------------------------------------------------------------------

  app.use("/", apiRouter);

  // ---------------------------------------------------------------------
  // Error handling. These MUST come last: Express only reaches them once no
  // route above has answered the request.
  // ---------------------------------------------------------------------

  // No route matched the URL -> 404.
  app.use(notFoundHandler);

  // A route (or a middleware) threw -> consistent JSON error response.
  app.use(errorHandler);

  return app;
}
