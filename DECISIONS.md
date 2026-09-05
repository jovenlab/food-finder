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
