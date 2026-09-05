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
