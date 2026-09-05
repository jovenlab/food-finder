"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

// Reads the ?checkout= parameter Stripe sends the browser back with, and tells
// the page what happened.
//
// This component exists separately because useSearchParams forces the component
// tree up to the nearest <Suspense> boundary to be client-rendered. Keeping it
// tiny means only this banner loses prerendering, not the whole page - which is
// exactly what the Next.js documentation recommends.

export type CheckoutOutcome = "success" | "cancelled";

export function CheckoutReturn({
  onOutcome,
}: {
  onOutcome: (outcome: CheckoutOutcome) => void;
}) {
  const searchParams = useSearchParams();

  const checkout = searchParams.get("checkout");

  // Report the outcome once, then scrub the parameters from the address bar.
  //
  // Without the scrub, refreshing the page - or sharing the link - would replay
  // "payment received" forever. replaceState changes the URL without a
  // navigation, so React state survives.
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current) return;
    if (checkout !== "success" && checkout !== "cancelled") return;

    reported.current = true;
    onOutcome(checkout);

    window.history.replaceState({}, "", window.location.pathname);
  }, [checkout, onOutcome]);

  // Renders nothing at all.
  //
  // The banner is owned by the page, not by this component. Scrubbing the URL
  // clears useSearchParams, so anything rendered from `checkout` here would
  // appear for a single frame and then vanish - which is exactly the bug this
  // shape avoids. Reporting the outcome upward lets the page keep it in state
  // for as long as it is useful.
  return null;
}
