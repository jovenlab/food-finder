import type { Request, Response } from "express";
import { createCheckoutSession } from "../services/checkout.service";

// Starts a subscription.
//
// POST, not GET: this creates something on Stripe's side, so it is not safe to
// repeat by refreshing or prefetching. A browser or proxy may fetch a GET at any
// time; it will never do that with a POST.
//
// The response is a URL, not a redirect. Returning 302 would make the browser
// follow it inside the fetch() call, where the frontend cannot see or handle it.
// Handing back the URL lets the page decide when to navigate - and lets it show
// an error instead if something went wrong.

export async function createCheckoutSessionHandler(_req: Request, res: Response) {
  const session = await createCheckoutSession();

  res.json({
    url: session.url,
    sessionId: session.sessionId,
  });
}
