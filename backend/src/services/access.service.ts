// WHAT the user is allowed to see.
//
// This is the authorization layer, and it is deliberately its own file even
// though it is currently tiny. Three separate ideas are involved and they change
// for different reasons:
//
//   identity      - who the user is                (user.service.ts)
//   subscription  - what Stripe says about them    (subscription.service.ts)
//   access        - what our rules let them do     (here)
//
// Today "may see nutrition" happens to be identical to "has a live
// subscription". They are still not the same thing. If a free trial, a staff
// flag, or a second paid tier ever appears, only this file changes - and
// Milestone 16 has exactly ONE function to enforce and ONE function to test.

import { requireDemoUser } from "./user.service";
import { getSubscriptionState, type SubscriptionState } from "./subscription.service";
import type { User } from "../generated/prisma/client";

// The permissions our application recognises.
export type AccessRights = {
  // Detailed nutritional values. The assignment restricts these to a demo user
  // with an active Stripe subscription.
  nutrition: boolean;
};

// The single rule, written once.
//
// Pure and exported so a test can pass in a state and assert the outcome without
// a database.
export function rightsFor(subscriptionState: SubscriptionState): AccessRights {
  return {
    nutrition: subscriptionState.isLive,
  };
}

export type DemoUserAccess = {
  user: User;
  subscription: SubscriptionState;
  rights: AccessRights;
};

// Everything the request path needs, resolved in one call.
//
// Route handlers use this instead of assembling the three pieces themselves,
// which is what stops the access rule being re-implemented - slightly
// differently, and eventually wrongly - in each place that needs it.
export async function getDemoUserAccess(): Promise<DemoUserAccess> {
  const user = await requireDemoUser();
  const subscription = await getSubscriptionState(user.id);

  return {
    user,
    subscription,
    rights: rightsFor(subscription),
  };
}

// The version the request path uses, which never throws.
//
// Resolving access needs the database. Product search must keep working when the
// database is down (decision 8), so this cannot be allowed to fail the request.
//
// It therefore FAILS CLOSED: if we cannot prove the user is entitled, they do not
// get the data. Failing open would mean a database outage silently handed
// premium content to everyone - the worst possible time to be generous.
export async function canViewNutritionSafely(): Promise<boolean> {
  try {
    const access = await getDemoUserAccess();
    return access.rights.nutrition;
  } catch (error) {
    console.error("Could not determine nutrition access - DENYING access:", error);
    return false;
  }
}

