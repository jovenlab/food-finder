# Technical decisions

A running record of choices that a reader might otherwise question, and why they
were made. Written as we go so the reasoning is not reconstructed afterwards.

---

## 1. Open Food Facts: the legacy `cgi/search.pl` endpoint

**Decision.** Product search uses `https://world.openfoodfacts.org/cgi/search.pl`
rather than the newer `/api/v2/search`.

**Why.** `api/v2/search` silently ignores free-text search terms. Tested
directly: searching `nutella` returned unrelated products (*Fromage Blanc
Nature*) and a count of 4,729,338 — effectively the whole database. v2 filters by
tags only, so it cannot do what this assignment needs. The newer endpoint would
have *looked* like it worked while returning nonsense.

**Trade-off.** We depend on an older endpoint. It is still the documented way to
do full-text search.

---

## 2. Transforming the Open Food Facts response instead of forwarding it

**Decision.** The backend converts Open Food Facts products into our own small
type before returning them.

**Why.**

- **Security** — we choose what leaves our server. This is what makes hiding
  nutrition data possible at all.
- **Stability** — if a field is renamed upstream, one file changes.
- **Size** — a full product has 200+ fields; we return 8.
- **Predictability** — `null` always means "missing". Upstream uses `""`,
  absent fields, and numbers written as text (`"250.5"`) interchangeably.

---

## 3. Products with neither a name nor a brand are dropped

**Decision.** A product that has no name *and* no brand is removed from results.

**Why.** It would render as a blank card. Measured against real data: about one
in five results for "milk" has no usable name.

**Trade-off.** `totalCount` (from Open Food Facts) is larger than the number of
products we return. Both values are in the API response and documented, so the
interface can be honest about the difference. The rule lives in a single named
function, `isDisplayable`, so it is easy to find and change.

---

## 4. `nameLanguage`: being honest about missing translations

**Decision.** Each product reports which language its name is *actually* in, and
the interface marks names that are not in the selected language.

**Why.** Open Food Facts does not have every product in every language. Measured
on a live "chocolate" search requesting Dutch: **only 5 of 20 names were Dutch** —
the rest were French, English, Spanish and Italian. Presenting those as Dutch
translations would be a lie, and the assignment explicitly says not to invent
translations for product data.

---

## 5. Internationalization without a library

**Decision.** Interface translations are a plain object plus React Context, not
`next-intl` or `react-i18next`.

**Why.** `next-intl` requires `[locale]` URL routing, which restructures the
whole app. `react-i18next` is a large dependency. For four languages and ~25
strings, a dictionary and a `t()` function are less code, have no dependencies,
and are entirely explainable.

TypeScript enforces completeness: English defines the keys, the other three are
typed `Record<TranslationKey, string>`, so a missing German string fails the
build rather than showing a blank.

**Known limitation.** No plural rules and no lazy-loaded locale files. Neither
matters at this size; both would matter in a larger app.

---

## 6. The language choice lives in `localStorage`, read via `useSyncExternalStore`

**Decision.** The selected language is stored in `localStorage` and read with
React's `useSyncExternalStore`.

**Why.** The obvious approach — `useState` plus a `useEffect` that reads storage —
renders once in the wrong language and then again in the right one, and does not
notice another tab changing it. `useSyncExternalStore` takes a *server snapshot*
(the default language), which lets the server and client legitimately differ
without a hydration mismatch. Verified: no hydration warnings with a stored
language different from the server's.

---

## 7. Recent searches are append-only, deduplicated when read

**Decision.** Every search inserts a row. Duplicates are collapsed when reading,
on the **term only** (case-insensitively), ignoring language.

**Why.** An append-only table is an honest log of what happened and when.
Collapsing is a display concern: showing two identical "chocolate" chips because
the term was searched in two languages would look like a bug.

**When a row is written.** Only after Open Food Facts answers successfully. A
search that found nothing *is* recorded — the user genuinely searched for it. A
blank term rejected with a 400 is not.

---

## 8. A database failure must never break a product search

**Decision.** Recording a search uses `recordSearchSafely`, which cannot throw.

**Why.** Logging history is secondary to answering the user. Verified: with MySQL
completely unreachable, `/products/search` still returned 20 products and HTTP
200, and the failure was logged server-side.

`/searches/recent` is different — it genuinely cannot work without the database —
so it returns `503 DATABASE_UNAVAILABLE`, not a 500. A database outage is an
expected condition, not a bug in our code.

---

## 9. The demo user: no authentication at all

**Decision.** One row in `User`, created by `prisma/seed.ts`, identified by the
constant email `demo@foodfinder.local`. No login, no password, no session, no
token.

**Why.** The assignment asks for a single demo user. Building registration,
password hashing, sessions and a login screen would be a large amount of code
that demonstrates nothing the assignment asked for, and would need explaining and
defending at review.

**The property that matters:** the *backend* decides who the user is. No endpoint
accepts a user id from the browser — there is no `?userId=` to tamper with. This
is why `/me` and `/searches/recent` take no parameters. The day real accounts are
added, the identity lookup changes in one file and every other endpoint is
already safe.

**Trade-off.** Everyone using the deployment shares one account and one search
history. Acceptable for a demo; stated plainly rather than hidden.

---

## 10. Identity, subscription and access are three separate layers

**Decision.** Three services rather than one:

| Layer | File | Question it answers |
|---|---|---|
| Identity | `user.service.ts` | Who is this? |
| Subscription | `subscription.service.ts` | What does Stripe say? |
| Access | `access.service.ts` | What may they see? |

**Why.** They change for different reasons. Identity is fixed. Subscription
status is Stripe's fact, which we mirror. Access is *our* rule about that fact —
and rules move: a free trial, a staff flag, or a second paid tier would change
only the access layer.

Today `canViewNutrition` is identical to `hasLiveSubscription`. They are still
not the same idea, and keeping them apart means the enforcement point in
Milestone 16 is one named function with one place to test.

---

## 11. Which subscription statuses grant access

**Decision.** `active` and `trialing` grant access. Everything else does not.

Two refinements:

- **`cancelAtPeriodEnd: true` still grants access** until the period ends. The
  customer paid for that time; cutting them off at the moment they click cancel
  would be taking money for nothing. Stripe keeps the status `active` until the
  period ends, and so do we.
- **A `currentPeriodEnd` in the past denies access even if the status says
  `active`.** This is a safety net: one missed `customer.subscription.deleted`
  webhook would otherwise grant access forever.

**`past_due` is deliberately denied.** Payment has failed and Stripe is retrying.
When payment is uncertain the safe default is to withhold.

**Any live row grants access**, rather than only the newest row. Stripe webhooks
can arrive out of order, so "most recently inserted" is not reliably "current
subscription". The expiry check above prevents a stale `active` row from granting
access indefinitely.

Verified against all ten combinations, including a stale `active` row and
out-of-order webhook arrival.

---

## 12. Nutrition values are not in the API until access is enforced

**Decision.** `/products/search` returns `nutritionAvailable: true|false`, never
the values themselves. Milestone 16 adds the values behind the subscription
check.

**Why.** Returning them from an endpoint that enforces nothing would leak
protected data to anyone who opened DevTools, regardless of what the React
components chose to render. Hiding data in the browser is not access control.
There is deliberately no commit in which nutrition data is reachable without a
check.

---

## 13. Stripe configuration is optional at startup, validated when present

**Decision.** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` and `STRIPE_WEBHOOK_SECRET`
have no defaults and are not required for the server to start. Anything that
needs Stripe fails at the point of use with `503 STRIPE_NOT_CONFIGURED`.

**Why.** Product search, translations and search history need no Stripe account.
Requiring the keys at boot would stop someone running the project at all before
they had signed up to Stripe. Failing loudly at the point of use is just as
safe and far friendlier.

No secret has a fallback value: a secret with a default is a secret waiting to be
committed.

---

## 14. Live Stripe keys are refused outright

**Decision.** A `STRIPE_SECRET_KEY` beginning `sk_live_` throws at startup.

**Why.** This is an assignment run against test data, and the difference between
test and live is one character in a `.env` file. A live key here could move real
money. Stripe puts the mode in the key itself, so the check is trivial and the
downside of getting it wrong is not.

The shapes of all three values are validated too, which catches the common
mistake of pasting a publishable key (`pk_test_...`) where the secret key
belongs.

`npm run stripe:check` goes further and asks Stripe itself: `balance.livemode`
must be `false`. That is authoritative, rather than inferred from the key's
prefix.

---

## 15. Known dependency vulnerabilities in the MySQL driver

**Decision.** `npm audit` reports high-severity advisories in `mariadb` (via
`@prisma/adapter-mariadb`) and `mysql2`. We are not fixing them now.

**Why.** They pre-date the Stripe work and are unrelated to it. The `mariadb`
advisories have **no fix available**. The `mysql2` fix requires
`npm audit fix --force`, which downgrades Prisma 7 to 6 - a breaking change to
the database layer late in the project.

**Risk assessment.** The advisories concern credentials leaking to a
man-in-the-middle and a decompression-bomb denial of service. This application
connects to MySQL on `localhost`, so there is no network path for an attacker to
sit in. The risk in this deployment is negligible.

**Honest limitation.** In a real deployment with a remote database this would
need resolving before going live. Recorded here rather than quietly ignored.

---

## 16. Checkout returns a URL, and returning from Stripe proves nothing

**Decision.** `POST /checkout/session` responds with a URL for the frontend to
navigate to, rather than issuing a `302`. And the `success_url` return is treated
as "payment probably happened", never as "subscribed".

**Why the URL and not a redirect.** A `302` inside `fetch()` is followed by the
browser transparently, so the page never sees it and cannot show an error if
something failed. Returning the URL keeps the decision in the caller's hands.

**Why the return is not proof.** `success_url` is an ordinary URL. A user can
type it, bookmark it, or share it; they can also close the tab before paying, or
the card can fail after the redirect. None of that is under our control.
Verified: visiting `/?checkout=success` directly grants no access at all — the
page shows "waiting for confirmation" and then "still waiting".

The only trustworthy signal is Stripe telling our **server** what happened, with
a signature we verify. That is Milestone 15.

---

## 17. The already-subscribed check lives on the server

**Decision.** `POST /checkout/session` returns `409 ALREADY_SUBSCRIBED` when a
live subscription exists, in addition to the frontend hiding the button.

**Why.** Hiding a button prevents an honest mistake, not a deliberate request.
Without the server check, a direct `POST` would create a second live
subscription and bill the customer twice a month. Verified with a live row
present: `409`.

---

## 18. The checkout banner is page state, not URL state

**Decision.** `CheckoutReturn` reads `?checkout=`, reports it upward, scrubs the
URL, and renders nothing. The banner is rendered by the page from its own state.

**Why.** Found by testing: scrubbing the URL clears `useSearchParams`, so a
banner rendered from that value appeared for one frame and vanished. Scrubbing
matters too — without it, a refresh would replay "payment received" forever.

`useSearchParams` also forces everything up to the nearest `<Suspense>` boundary
to be client-rendered, so the boundary is wrapped tightly around this one small
component. The page remains statically prerendered.

---

## 19. The webhook route must parse the raw body, before `express.json()`

**Decision.** `app.ts` registers `express.raw({ type: "application/json" })` for
`/stripe/webhook` **before** the global `express.json()`.

**Why.** Stripe signs the exact bytes it sent. `express.json()` parses those
bytes into an object and discards them; re-serialising produces different bytes —
a different key order or one extra space is enough — and the signature no longer
matches. Verification would then fail on every genuine request, which is a
miserable bug to diagnose because nothing looks wrong.

This ordering is load-bearing and commented as such in `app.ts`.

---

## 20. Webhook signature verification, and what the status codes mean

**Decision.** Every webhook is verified with `constructEvent` before any field is
read. The response status is chosen for Stripe's retry logic, not for a human:
`200` handled, `400` never retry, `500` please retry.

**Why verification matters.** `POST /stripe/webhook` is a public URL. Without a
signature check it is a free-subscription button: anyone could post
`{"type":"customer.subscription.created", ...}` and grant themselves access.
`constructEvent` also rejects old timestamps, which blocks replaying a genuine
captured request.

Verified against five attacks — no signature, garbage signature, a body tampered
with after signing, a signature made with the wrong secret, and a correctly
signed request with an hour-old timestamp. All five returned `400` and left the
database untouched.

---

## 21. Webhook handling is idempotent

**Decision.** Every write is `prisma.subscription.upsert`, keyed on Stripe's
subscription id.

**Why.** Stripe retries until it receives a 2xx and can deliver the same event
more than once even after success. An `INSERT` would create duplicate rows;
an upsert re-writes the same row with the same values. Verified: replaying an
event leaves exactly one row.

---

## 22. `current_period_end` is read from the subscription's ITEMS

**Decision.** `readCurrentPeriodEnd()` reads
`subscription.items.data[0].current_period_end`, not
`subscription.current_period_end`.

**Why.** Stripe moved period boundaries onto subscription items, so a
subscription with several items can bill them on different cycles. The old
top-level field no longer exists in this SDK version. Reading it returns
`undefined`, which stores `null` — and a null `currentPeriodEnd` disables the
"has this expired?" safety net from decision 11, silently granting access
forever after one missed cancellation webhook.

Found by checking the SDK's type definitions before writing the code rather than
after debugging it.

---

## 23. Nutrition access is enforced where the data is produced

**Decision.** `product.controller.ts` asks `canViewNutritionSafely()` and includes
the `nutrition` object only when the answer is yes. There is exactly one such
place, and every product passes through it.

**Why not in React.** If the backend sent the values and the components chose not
to render them, the data would still be in the response — three clicks in
DevTools away. Hiding something in the interface hides it only from people who
were not looking. The single place a rule can be enforced is where the data is
produced.

The values are not blanked or zeroed; they are **never serialised**. An
unentitled caller receives a response that does not contain them, so there is
nothing to find in DevTools, a proxy log, or a saved response.

**Verified** against ten bypass attempts with no subscription — forged
`?nutrition=true`, `?access=true`, `?userId=1`, `Authorization: Bearer`,
`x-subscribed`/`x-access-nutrition`/`x-user-id` headers, a `subscribed=true`
cookie, a POST, and probing `/me` and `/searches/recent`. Every one returned
products with no nutritional values. The same plain request with an active
subscription returned them.

---

## 24. Access checks fail CLOSED

**Decision.** `canViewNutritionSafely()` returns `false` when it cannot determine
entitlement — for example when the database is unreachable.

**Why.** Decision 8 says a database failure must not break product search, so the
check cannot be allowed to throw. That leaves a choice about what to assume when
the answer is unknown, and the only safe assumption is denial. Failing open would
mean a database outage silently handed premium content to everyone — the worst
possible moment to be generous.

**Verified:** with an active subscription in place but the database unreachable,
search returned 20 products and `access.nutrition: false`, with no values in the
response.

---

## 25. `allowPublicKeyRetrieval` for local MySQL connections

**Decision.** `src/prisma.ts` appends `allowPublicKeyRetrieval=true` to the
database URL, but **only** when the host is `localhost`/`127.0.0.1`/`::1`.

**Why.** MySQL 8 authenticates with `caching_sha2_password`. The server caches a
successful authentication; while that cache is warm, connecting works. After the
server restarts the cache is empty and the client must complete a full RSA
exchange, for which the MariaDB driver refuses to fetch the server's public key
unless permitted. The failure appears only after a restart, on a setup that
worked the day before, with the message *"RSA public key is not available client
side"*.

Hit exactly this during Milestone 16 after the MySQL service restarted.

**Why only locally.** Retrieving the key over an unencrypted connection is
theoretically interceptable. On `localhost` there is no network path for anyone
to sit in. A remote database should use TLS instead, and the function leaves such
URLs untouched — related to the driver advisories in decision 15.

---

## 26. Resubscribing creates a new row, and any live row grants access

**Decision.** Cancelling and subscribing again produces a brand-new subscription
object in Stripe with a new id, so the webhook handler inserts a **new row**
rather than editing the old one. The old row stays, recording that it was
cancelled. Access is granted if **any** row is live.

**Why not just read the newest row?** Stripe webhooks can arrive out of order, so
"most recently inserted" is not reliably "current subscription". Verified: after
resubscribing, a late `customer.subscription.deleted` for the OLD subscription
arrived — and access was correctly retained, because the new subscription was
still live. Reading only the newest row would have revoked a paid subscription.

The expiry check from decision 11 is what stops this being too generous: a stale
`active` row cannot grant access once its period has passed.

---

## 27. The interface must not contradict the server

**Decision.** Every search response carries the server's own `access.nutrition`
decision. When it disagrees with the subscription panel's cached state, the page
re-fetches `/me`.

**Why.** Found by testing: with the page open, cancelling the subscription
server-side left the panel announcing **"Subscription active"** directly above a
grid of cards all saying **"Subscribe to see nutritional values"**. The data was
correctly withheld — the server decides that — but the interface was visibly
lying about why.

Comparing against a value already present in the response means we detect
staleness for free and re-fetch only when actually stale, rather than polling
`/me` on every search.

---

## 28. Showing the raw Stripe status to users was a mistake

**Decision.** The subscription panel no longer prints `Subscription status:
{status}`. It says why access ended in a sentence, and keeps the raw status in a
`title` tooltip for debugging.

**Why.** When a paid period lapses before Stripe's cancellation webhook arrives,
the stored status is still `active` while our expiry check has already withdrawn
access. The old copy therefore rendered **"Subscription status: active"**
immediately above a Subscribe button — accurate about Stripe's field, and
completely baffling to a person.

Now: *"Your last payment did not go through."* for `past_due`/`unpaid`/
`incomplete`, and *"Your previous subscription has ended."* otherwise.

