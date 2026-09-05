"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { MeResponse } from "@/lib/types";

// Shows whether the demo user is subscribed, and offers the Subscribe button.
//
// IMPORTANT: this is presentation only. Hiding the button when someone is
// already subscribed prevents an honest mistake, not a determined one - the
// backend refuses a second subscription itself (409 ALREADY_SUBSCRIBED), and
// Milestone 16 will enforce nutrition access on the server too. A React
// component is never a security boundary.

export function SubscriptionPanel({
  me,
  onSubscribe,
  isStarting,
  errorMessage,
}: {
  me: MeResponse | null;
  onSubscribe: () => void;
  isStarting: boolean;
  errorMessage: string | null;
}) {
  const { language, t } = useLanguage();

  // We do not know yet - render nothing rather than flashing "not subscribed"
  // at someone who is.
  if (me === null) return null;

  const formatDate = (iso: string | null) =>
    iso === null ? "" : new Date(iso).toLocaleDateString(language);

  if (me.subscription.active) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4
                      dark:border-emerald-900 dark:bg-emerald-950/40">
        <p className="font-medium text-emerald-800 dark:text-emerald-200">
          {t("subscribedTitle")}
        </p>

        {me.subscription.currentPeriodEnd && (
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
            {/* Cancelled but still paid for reads very differently from
                renewing, so they get different wording. */}
            {me.subscription.cancelAtPeriodEnd
              ? t("subscribedCancelling", { date: formatDate(me.subscription.currentPeriodEnd) })
              : t("subscribedUntil", { date: formatDate(me.subscription.currentPeriodEnd) })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <p className="font-medium">{t("subscribeTitle")}</p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("subscribeBody")}</p>

      <button
        type="button"
        onClick={onSubscribe}
        disabled={isStarting}
        className="mt-3 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white
                   transition hover:bg-emerald-700
                   disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isStarting ? t("subscribeStarting") : t("subscribeButton")}
      </button>

      {errorMessage && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          {errorMessage}
        </p>
      )}

      {/* Once the user has tried and something went wrong on Stripe's side, the
          raw status is genuinely useful - "past_due" tells them their card was
          declined, which "not subscribed" does not. */}
      {me.subscription.status !== "none" && (
        <p className="mt-2 text-xs text-gray-500">
          {t("subscriptionStatus", { status: me.subscription.status })}
        </p>
      )}
    </div>
  );
}
