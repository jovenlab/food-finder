# Food Finder — Backend API Contract

This is the agreement between the Express backend and the Next.js frontend.

The frontend never calls Open Food Facts directly. It only calls the endpoints
below, and the shapes documented here are the shapes it can rely on.

Base URL in development: `http://localhost:4000`

---

## Conventions

### Success

Every successful response is JSON with HTTP status `200`.

### Errors

Every error — from any endpoint, for any reason — has exactly this shape:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "A sentence a developer can read."
  }
}
```

Use `code` in the frontend to decide what to show. Use `message` for debugging.
`message` may change wording; `code` will not change without a note here.

### `null` means "not available"

Open Food Facts is community-edited, and much of its data is incomplete. Any
field typed `string | null` below is `null` when the information does not exist.
We never substitute a placeholder or invent a translation.

### Languages

Supported: `en`, `nl`, `de`, `fr`. Anything else is rejected with `400`.

---

## `GET /health`

Reports whether the server and its database are working. Intended for
monitoring and for the frontend's connection indicator.

**Query parameters:** none.

### Response `200` — healthy

```json
{
  "status": "ok",
  "service": "food-finder-backend",
  "timestamp": "2026-09-05T07:48:20.103Z",
  "database": { "status": "ok" }
}
```

### Response `503` — running but unusable

Returned when the server is up but MySQL cannot be reached.

```json
{
  "status": "degraded",
  "service": "food-finder-backend",
  "timestamp": "2026-09-05T07:48:20.103Z",
  "database": {
    "status": "error",
    "message": "pool timeout: failed to retrieve a connection from pool..."
  }
}
```

> Note: when the database is unreachable this endpoint can take around 10
> seconds to answer, because Prisma waits for its connection pool to time out.

---

## `GET /products/search`

Searches Open Food Facts for packaged food products.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/products/search` |
| **Auth** | none (public) |

### Query parameters

| Name | Required | Type | Default | Notes |
|---|---|---|---|---|
| `q` | yes | string | — | The search term. 1–100 characters after trimming. |
| `lang` | no | `en` \| `nl` \| `de` \| `fr` | `en` | Language for product names and images. An empty value is treated as absent. |

Repeating a parameter (`?q=a&q=b`) is rejected — send exactly one of each.

### Response `200`

```json
{
  "term": "nutella",
  "language": "en",
  "totalCount": 1031,
  "count": 19,
  "products": [
    {
      "code": "3017620422003",
      "name": "Nutella",
      "nameLanguage": "en",
      "brand": "Ferrero",
      "imageUrl": "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg",
      "quantity": "400 g",
      "nutriScore": "e",
      "nutritionAvailable": true
    }
  ]
}
```

#### Top-level fields

| Field | Type | Meaning |
|---|---|---|
| `term` | string | The trimmed term we actually searched for. |
| `language` | string | The language actually used. |
| `totalCount` | number | How many products Open Food Facts matched **in total**. |
| `count` | number | How many products are in `products` below. |
| `products` | array | The results. Can be empty. |

**`totalCount` is normally much larger than `count`.** Two reasons: we request a
single page of results, and we then drop entries that have neither a name nor a
brand, because they would render as blank cards. Do not show `totalCount` as
"results found" without explaining it.

#### Product fields

| Field | Type | Meaning |
|---|---|---|
| `code` | string | Barcode. The only always-present field; use it as the React `key`. |
| `name` | string \| null | Product name in the requested language, falling back to the product's default name, then English. |
| `nameLanguage` | string \| null | The language `name` is **actually** in. Null when there is no name. See below. |
| `brand` | string \| null | Primary brand. Open Food Facts stores a comma-separated list; we keep the first entry. |
| `imageUrl` | string \| null | Front-of-pack photo. Language-specific where available. |
| `quantity` | string \| null | Free text, e.g. `"400 g"`, `"3.5 oz"`. Not parsed — units are inconsistent. |
| `nutriScore` | string \| null | Open Food Facts health grade, `"a"` (best) to `"e"` (worst). Lowercase. |
| `nutritionAvailable` | boolean | Whether nutritional data exists for this product. |

### `nameLanguage` — when the name is not in the language you asked for

Open Food Facts does not have every product in every language. Asking for `nl`
and receiving an English name is common.

`nameLanguage` reports the language the returned `name` is really in:

- equal to the requested `lang` — a genuine translation exists
- something else (`"en"`, `"es"`, `"ar"`, …) — no name in the requested
  language, so this is a fallback
- `null` — the product has no name at all

It can hold any language code Open Food Facts uses, not only our four. The
frontend uses it to mark fallback names instead of passing them off as
translations. We never translate product data ourselves.

### Nutritional data is intentionally absent

`nutritionAvailable` is a boolean, **not** the values.

The assignment requires detailed nutritional information to be available only to
a demo user with an active Stripe subscription. Returning the values from this
endpoint — which enforces no subscription check — would leak protected data to
anyone who opened DevTools, no matter what the React components chose to render.

Milestone 16 adds a `nutrition` object to each product, populated only when the
demo user has an active subscription. Until then this flag lets the interface
say "nutrition available" honestly without exposing anything.

### Error responses

| Status | `code` | Cause |
|---|---|---|
| `400` | `EMPTY_SEARCH_TERM` | `q` missing, blank, or repeated. |
| `400` | `SEARCH_TERM_TOO_LONG` | `q` longer than 100 characters. |
| `400` | `UNSUPPORTED_LANGUAGE` | `lang` is not `en`, `nl`, `de` or `fr`. |
| `502` | `EXTERNAL_API_ERROR` | Open Food Facts returned an error status, non-JSON, or an unrecognisable body. |
| `504` | `EXTERNAL_API_TIMEOUT` | Open Food Facts did not respond within the configured timeout (25s default). |
| `500` | `INTERNAL_ERROR` | A bug on our side. |

Examples:

```json
{ "error": { "code": "EMPTY_SEARCH_TERM",
             "message": "The \"q\" query parameter is required, for example /products/search?q=nutella" } }
```

```json
{ "error": { "code": "UNSUPPORTED_LANGUAGE",
             "message": "Unsupported language \"es\". Supported languages: en, nl, de, fr." } }
```

### A successful search can return zero products

This is the distinction most easily got wrong:

| Situation | Status | Body |
|---|---|---|
| Products found | `200` | `count > 0` |
| **Nothing matched** | `200` | `count: 0`, `products: []` |
| Open Food Facts is broken | `502` / `504` | `error` object |

"We found nothing" is a **successful** request. The frontend must show
"No products found", not an error message. Only `502`/`504` mean something is
actually wrong.

---

## `GET /me`

Who the application thinks the user is, what their subscription looks like, and
what they are allowed to see.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/me` |
| **Auth** | none — there is one demo user and the backend decides who that is |

**Query parameters:** none, deliberately. No endpoint accepts a user id from the
browser.

### Response `200`

```json
{
  "user": {
    "id": 1,
    "name": "Demo User",
    "email": "demo@foodfinder.local",
    "hasStripeCustomer": false
  },
  "subscription": {
    "status": "none",
    "active": false,
    "currentPeriodEnd": null,
    "cancelAtPeriodEnd": false
  },
  "access": {
    "nutrition": false
  }
}
```

| Field | Type | Meaning |
|---|---|---|
| `user.hasStripeCustomer` | boolean | Whether this user has been through Stripe Checkout before. A boolean, not the customer id — the browser has no use for the id. |
| `subscription.status` | string | `"none"` if never subscribed, otherwise Stripe's own word (`active`, `trialing`, `past_due`, `canceled`, …). |
| `subscription.active` | boolean | Whether the subscription is live **right now**. Not the same as `status === "active"` — see below. |
| `subscription.currentPeriodEnd` | string \| null | ISO 8601, when the paid period ends. |
| `subscription.cancelAtPeriodEnd` | boolean | Cancelled, but paid time remains. |
| `access.nutrition` | boolean | Whether detailed nutritional values may be shown. |

### `status` is not the same as `active`

`active` is our decision; `status` is Stripe's label. They differ in two cases:

- `status: "active"` with `currentPeriodEnd` in the past gives `active: false` —
  a safety net against a webhook we never received.
- `status: "trialing"` gives `active: true`.

`cancelAtPeriodEnd: true` does **not** reduce access: the customer keeps it until
the period they paid for runs out.

### This endpoint describes access; it does not enforce it

The frontend uses `access.nutrition` to decide whether to show a subscribe prompt
or a nutrition panel. That is presentation only. The search endpoint performs its
own check (Milestone 16) — a browser can ignore anything it is told.

### Error responses

| Status | `code` | Cause |
|---|---|---|
| `503` | `DEMO_USER_MISSING` | The database has not been seeded. Run `npm run db:seed`. |
| `503` | `DATABASE_UNAVAILABLE` | MySQL cannot be reached. |

---

## `POST /checkout/session`

Starts a monthly subscription by creating a Stripe Checkout session.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/checkout/session` |
| **Auth** | none — there is one demo user and the backend decides who that is |

**Body:** none. **Query parameters:** none.

`POST`, not `GET`, because it creates something on Stripe's side: a browser or
proxy may fetch a `GET` at any time, but never a `POST`.

### Response `200`

```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

The frontend navigates to `url`. We return the URL rather than a `302` so the
caller can show an error instead when something goes wrong — a redirect would be
followed inside `fetch()`, where the page cannot see it.

The session is created with `mode: "subscription"`; the monthly interval comes
from the Price configured in Stripe.

### What this endpoint does NOT do

It does not grant access. Creating a session means "the user is about to try to
pay". The subscription becomes real only when Stripe tells our server via a
webhook (Milestone 15). Returning to `success_url` proves nothing — anyone can
visit that URL.

### Error responses

| Status | `code` | Cause |
|---|---|---|
| `409` | `ALREADY_SUBSCRIBED` | There is already a live subscription. Enforced server-side, not just by hiding the button. |
| `503` | `STRIPE_NOT_CONFIGURED` | `STRIPE_SECRET_KEY` or `STRIPE_PRICE_ID` is missing. |
| `503` | `DEMO_USER_MISSING` | The database has not been seeded. |
| `502` | `STRIPE_NO_CHECKOUT_URL` | Stripe returned a session without a URL. |

---

## `GET /searches/recent`

The demo user's most recent searches, newest first. Used to offer one-click
shortcuts in the interface.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/searches/recent` |
| **Auth** | none (public) |

**Query parameters:** none. The backend decides whose history this is — there is
one demo user, and the browser cannot ask for someone else's.

### Response `200`

```json
{
  "count": 2,
  "searches": [
    { "term": "Chocolate", "language": "en", "searchedAt": "2026-09-05T10:15:06.861Z" },
    { "term": "yoghurt",   "language": "nl", "searchedAt": "2026-09-05T10:15:06.723Z" }
  ]
}
```

| Field | Type | Meaning |
|---|---|---|
| `term` | string | Exactly what was typed, trimmed. |
| `language` | string | The language it was searched in. |
| `searchedAt` | string | ISO 8601, UTC. Formatting is the browser's job, not ours. |

At most 8 entries. Repeated terms appear once, at their most recent time —
searching "chocolate" twice does not fill the list. Both rows still exist in the
database; collapsing is a display concern.

An empty history is `{ "count": 0, "searches": [] }` with status `200`.

### When a search is recorded

A row is written **after** Open Food Facts answers successfully:

| Situation | Recorded? |
|---|---|
| Search returned products | yes |
| Search returned zero products | **yes** — the user genuinely searched for it |
| Blank or over-long term (`400`) | no — a validation mistake is not a search |
| Open Food Facts failed (`502` / `504`) | no |

Writing the row can never fail the request. If MySQL is unreachable the search
still returns products and the failure is logged server-side.

---

## `POST /stripe/webhook`

Called by **Stripe**, never by a person or by our frontend. This is how the
backend learns that a subscription was created, changed or cancelled.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/stripe/webhook` |
| **Body** | Raw JSON, signed by Stripe |
| **Required header** | `stripe-signature` |

### Signature verification

Every request is verified against `STRIPE_WEBHOOK_SECRET` before a single field
is read. This endpoint is publicly reachable — without verification, anyone could
POST a fake `customer.subscription.created` and grant themselves a subscription.

Verification needs the **raw request body**: Stripe signs exact bytes, and
re-serialising parsed JSON produces different ones. `app.ts` therefore registers
`express.raw()` for this path **before** `express.json()`. That ordering is
load-bearing.

### Events handled

| Event | Effect |
|---|---|
| `checkout.session.completed` | Fetches the new subscription from Stripe and stores it |
| `customer.subscription.created` | Upserts the subscription row |
| `customer.subscription.updated` | Upserts — covers status changes, cancellation, renewal |
| `customer.subscription.deleted` | Upserts with Stripe's `canceled` status |
| anything else | Acknowledged with `200` and ignored |

### Status codes are instructions to Stripe

| Status | Meaning to Stripe | When |
|---|---|---|
| `200` | Understood, do not resend | Handled, ignored, or not our user |
| `400` | Do not retry | Missing/invalid signature, tampered body, stale timestamp |
| `500` | **Please retry** | We failed to process it (e.g. database down) |

Returning `500` on a processing failure is deliberate: the payment is real and
our records are behind, so we want Stripe to try again.

### Idempotency

Stripe retries until it gets a 2xx and may deliver the same event more than once.
Every write is an `upsert` keyed on Stripe's subscription id, so a replay produces
an identical row. Verified: sending the same event twice leaves exactly one row.

### `current_period_end` lives on the subscription's items

Stripe moved period boundaries off the Subscription object and onto
`subscription.items.data[]`. Reading `subscription.current_period_end` yields
`undefined`, which would store `null` and silently disable the expiry safety net
described under `GET /me`.

---

## Any unknown route

### Response `404`

```json
{ "error": { "code": "NOT_FOUND", "message": "Route not found: GET /nope" } }
```

---

## Rate limiting (external)

Open Food Facts allows roughly **10 searches per minute** and intermittently
returns `503` even below that. Our backend surfaces both as `502
EXTERNAL_API_ERROR`. Automated tests must use a mock rather than the live API.
