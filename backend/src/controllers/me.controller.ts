import type { Request, Response } from "express";
import { getDemoUserAccess } from "../services/access.service";
import { withDatabase } from "../errors/withDatabase";

// Reports who the application thinks the user is, what their subscription looks
// like, and what they are allowed to see.
//
// The frontend uses this to decide whether to show a "Subscribe" button or the
// nutrition panel. It is NOT what protects the data: the search endpoint does
// its own check in Milestone 16. This endpoint only describes the decision, it
// does not enforce it - a browser can lie about anything it is told.
//
// Note there is no id in the URL. There is one demo user and the backend decides
// who that is.

export async function getMeHandler(_req: Request, res: Response) {
  const access = await withDatabase("Account information", getDemoUserAccess);

  const { user, subscription, rights } = access;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      // A boolean, not the id itself. The frontend only needs to know whether
      // this user has been through Stripe Checkout before.
      hasStripeCustomer: user.stripeCustomerId !== null,
    },
    subscription: {
      // "none" when the user has never subscribed, otherwise Stripe's own word.
      status: subscription.subscription?.status ?? "none",
      active: subscription.isLive,
      currentPeriodEnd:
        subscription.subscription?.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription.subscription?.cancelAtPeriodEnd ?? false,
    },
    access: rights,
  });
}
