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
  // Two small hardening steps. Both are one line and cost nothing.
  // ---------------------------------------------------------------------

  // Express advertises itself with "X-Powered-By: Express" on every response.
  // That tells an attacker which framework - and therefore which published
  // vulnerabilities - to try first. There is no reason to volunteer it.
  app.disable("x-powered-by");

  // Tells the browser to believe our Content-Type instead of guessing from the
  // bytes. Without it a browser can decide a JSON response "looks like" HTML or
  // a script and treat it as one - which is how a reflected value in an API
  // response turns into a scripting bug.
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  // Deliberately NOT using helmet here. Most of what it sets - Content-Security
  // -Policy, HSTS, frame options - protects HTML pages, and this server returns
  // only JSON. Two explicit headers we can explain beat a dependency whose
  // defaults we would have to look up.

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

  // ---------------------------------------------------------------------
  // The Stripe webhook needs the RAW request body, and needs it BEFORE the
  // JSON parser gets to it.
  //
  // Stripe signs the exact bytes it sent. express.json() parses those bytes
  // into an object and throws them away; re-serialising the object produces
  // different bytes - a different key order or one space is enough - and the
  // signature no longer matches. Verification would fail on every genuine
  // request, which is a maddening bug to diagnose.
  //
  // Registering express.raw() for this one path first keeps the body as a
  // Buffer. express.json() below then skips it, because the body is already
  // parsed. Every other route still gets normal JSON parsing.
  //
  // This ordering is load-bearing. Moving the line below express.json() breaks
  // Stripe webhooks completely.
  app.use("/stripe/webhook", express.raw({ type: "application/json" }));

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
