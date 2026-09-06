# Food Finder

Search packaged food products from [Open Food Facts](https://world.openfoodfacts.org),
in English, Dutch, German or French. Anyone can see a product's name, brand and
photo. Detailed nutritional values require an active Stripe subscription, and
that rule is enforced by the backend.

Built as a technical assignment. Everything runs locally; Stripe runs in test
mode and never touches real money.

---

## Contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Setup](#setup) — start here on a new machine
- [Running it](#running-it)
- [Running the tests](#running-the-tests)
- [Database](#database)
- [Internationalization](#internationalization)
- [Subscriptions](#subscriptions)
- [Technical decisions](#technical-decisions)
- [Known limitations](#known-limitations)
- [Project layout](#project-layout)

---

## What it does

| | |
|---|---|
| **Search** | Type a term, get products from Open Food Facts — name, brand, photo, quantity |
| **Four languages** | English, Dutch, German, French. Chosen manually; the interface *and* product names follow |
| **Recent searches** | Stored in MySQL against the demo user, offered back as one-click shortcuts |
| **Subscription** | Monthly, via Stripe Checkout in test mode |
| **Protected data** | Nutritional values are returned **only** to a subscriber — decided on the server |

Everything is public except the nutritional values.

---

## Architecture

```text
                    Browser
                       |
                       |  HTTP  (only ever to our own backend)
                       v
        +------------------------------+
        |   Next.js frontend  :3000    |   React, TypeScript, Tailwind
        +------------------------------+
                       |
                       |  GET /products/search, /me, /searches/recent
                       |  POST /checkout/session
                       v
        +------------------------------+
        |   Express backend   :4000    |   TypeScript
        +------------------------------+
           |            |            |
           |            |            +--------> Stripe  (Checkout, subscriptions)
           |            |                          |
           |            |            webhook       |  POST /stripe/webhook
           |            |            <-------------+
           |            |
           |            +---------------------> Open Food Facts  (product data)
           |
           v
        Prisma  (typed database client)
           |
           v
        MySQL  :3306
           ^
           |  SQL typed by hand
        MySQL Workbench
```

### Why a separate backend at all

The browser never talks to Open Food Facts or Stripe directly. Three reasons,
and the third is the important one:

1. The browser would be blocked by CORS.
2. Open Food Facts requires a `User-Agent` identifying the application, which a
   browser will not let us set.
3. **Nutritional data must be withheld from non-subscribers.** That is impossible
   if the browser fetches the data itself — and equally impossible if the backend
   sends the values and React merely declines to render them. Anyone can open
   DevTools. The rule can only live where the data is produced.

### How a search flows

```text
1. User types "chocolate" and submits
2. Frontend  ->  GET /products/search?q=chocolate&lang=de
3. Backend       validates the input
4. Backend   ->  Open Food Facts, asking for German fields
5. Backend       converts 200+ raw fields into our own 9-field shape
6. Backend       writes the search to MySQL (failure here never breaks the search)
7. Backend       asks: may this user see nutrition?   <-- the access decision
8. Backend   ->  JSON, with nutrition values only if the answer was yes
9. Frontend      renders cards; missing data shows a fallback, never "null"
```

---

## Setup

Written for a machine that has never seen this project.

### 1. Prerequisites

| Tool | Version used | Check |
|---|---|---|
| Node.js | 24.x | `node -v` |
| npm | 11.x | `npm -v` |
| MySQL Server | 8.x | should be running on port 3306 |
| MySQL Workbench | any | optional, but the database instructions assume it |
| Stripe CLI | any | only needed for webhooks — [install](https://docs.stripe.com/stripe-cli) |

A free [Stripe account](https://dashboard.stripe.com/register) is needed for the
subscription parts. **Everything else works without one.**

### 2. Install dependencies

```bash
npm run install:all
```

Or by hand:

```bash
cd backend  && npm install
cd ../frontend && npm install
```

> Installing the backend also runs `prisma generate`, which creates the typed
> database client in `backend/src/generated/`. That folder is deliberately not
> committed — it is generated from `schema.prisma`. Nothing compiles before it
> exists, which is why it is wired to `postinstall` rather than left as a step to
> remember.

### 3. Create the database

Open **MySQL Workbench**, connect as `root`, and open
`backend/db/01-create-database.sql`.

**Edit one line first** — replace `choose-a-strong-password` with a password of
your own:

```sql
CREATE USER IF NOT EXISTS 'food_finder_app'@'localhost'
  IDENTIFIED BY 'choose-a-strong-password';
```

Then run the whole script (⚡ icon). It creates:

- `food_finder` — the application database
- `food_finder_shadow` — a scratch database Prisma uses to verify migrations
- `food_finder_app` — a dedicated user with rights on **those two databases only**,
  so the application never connects as `root`

The script ends by printing what it made, so you can confirm it worked.

### 4. Configure the backend

```bash
cd backend
cp .env.example .env      # Windows: copy .env.example .env
```

Open `.env` and set both database URLs, using the password from step 3:

```ini
DATABASE_URL="mysql://food_finder_app:YOUR_PASSWORD@localhost:3306/food_finder"
SHADOW_DATABASE_URL="mysql://food_finder_app:YOUR_PASSWORD@localhost:3306/food_finder_shadow"
```

`DATABASE_URL` is the only setting the server refuses to start without. Leave the
Stripe values blank for now.

`.env.example` documents every variable, including the optional ones.

### 5. Configure the frontend

```bash
cd ../frontend
cp .env.example .env.local      # Windows: copy .env.example .env.local
```

The default is correct for local development. Nothing secret goes in this file —
anything named `NEXT_PUBLIC_*` is compiled into the JavaScript every visitor
downloads.

### 6. Create the tables and the demo user

```bash
cd ../backend
npm run db:deploy    # applies the existing migration
npm run db:seed      # inserts the demo user (safe to run repeatedly)
```

Confirm in Workbench:

```sql
USE food_finder;
SHOW TABLES;                -- user, search, subscription, _prisma_migrations
SELECT * FROM user;         -- one row: demo@foodfinder.local
```

### 7. Stripe (optional — skip to run without subscriptions)

With the dashboard's **Test mode** toggle **ON**:

1. **Developers → API keys** → copy the **Secret key** (`sk_test_…`).
2. **Product catalogue → Add product** → name it, choose **Recurring**,
   **Monthly**, any amount → save → copy the **price id** (`price_…`, *not*
   `prod_…`).
3. Put both in `backend/.env`.
4. Verify:

   ```bash
   npm run stripe:check
   ```

   It checks the key works, that Stripe itself reports `livemode: false`, and
   that the price really is billed monthly.

For webhooks, in a separate terminal:

```bash
stripe login
stripe listen --forward-to localhost:4000/stripe/webhook
```

Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET` and **restart the
backend**. That secret changes every time you restart `stripe listen`.

> A live key (`sk_live_…`) is **rejected at startup**. This project is test-mode
> only.

---

## Running it

Two terminals:

```bash
# Terminal 1
cd backend && npm run dev      # http://localhost:4000

# Terminal 2
cd frontend && npm run dev     # http://localhost:3000
```

Open <http://localhost:3000> and search for `nutella`.

### Checking the backend on its own

<http://localhost:4000/health>

```json
{
  "status": "ok",
  "database": { "status": "ok" },
  "stripe": { "configured": true, "webhookConfigured": true, "mode": "test" }
}
```

`"status": "degraded"` with HTTP 503 means the server is running but MySQL is
not reachable. `"stripe": { "configured": false }` is fine — the rest works.

The full API is documented in [`backend/API.md`](backend/API.md).

### If something is wrong

| Symptom | Cause |
|---|---|
| `Missing required environment variable: DATABASE_URL` | `.env` missing or the line is commented out |
| Server starts, but `/health` says `"status": "degraded"` | You copied `.env.example` without replacing `YOUR_PASSWORD_HERE`. The server starts because the URL is well-formed; it only fails when it first uses the database |
| `Demo user … not found` | Run `npm run db:seed` |
| `RSA public key is not available` | MySQL restarted and cleared its auth cache — already handled in `src/prisma.ts`; make sure the backend restarted too |
| `502 EXTERNAL_API_ERROR` on every search | Open Food Facts rate-limits at ~10 searches/minute. Wait a minute |
| Frontend says "Could not reach the server" | The backend is not running, or `NEXT_PUBLIC_API_URL` is wrong |
| `400 INVALID_SIGNATURE` on genuine webhooks | `STRIPE_WEBHOOK_SECRET` does not match the current `stripe listen`; update it and restart |

---

## Running the tests

```bash
npm test              # from the project root: both suites
npm run test:backend  # 60 tests
npm run test:frontend # 50 tests
```

Watch mode, from inside `backend/` or `frontend/`:

```bash
npm run test:watch
```

**No test needs MySQL, Stripe, or an internet connection.** Open Food Facts is
stubbed and Prisma is replaced with a spy, so the suite is fast and cannot fail
at random. Stripe webhook signatures, however, are **real** — signed with the
SDK's own helper, so the tests exercise the genuine verification path.

Reading a failure:

```text
FAIL tests/subscription.test.ts > isSubscriptionLive > denies access while a payment is failing
AssertionError: expected true to be false
```

That is *file → group → test name*, then expected versus actual.

---

## Database

Three tables, created by `backend/prisma/migrations/`.

```text
       User                          Subscription
+---------------------+       +--------------------------+
| id             (PK) |<---+  | id                  (PK) |
| email    (UNIQUE)   |    +--| userId              (FK) |
| name                |       | stripeSubscriptionId (U) |
| stripeCustomerId (U)|       | status                   |
| createdAt           |       | currentPeriodEnd         |
| updatedAt           |       | cancelAtPeriodEnd        |
+---------------------+       | createdAt / updatedAt    |
          ^                   +--------------------------+
          |
          |                          Search
          |                +--------------------------+
          +----------------| userId              (FK) |
                           | id                  (PK) |
                           | term                     |
                           | language                 |
                           | createdAt                |
                           +--------------------------+
```

**`User`** — identity only. One row: the demo user. `stripeCustomerId` is null
until the first trip through Stripe Checkout.

**`Subscription`** — a local copy of what Stripe knows, kept current by webhooks.
Stripe stays the source of truth; this table exists so that answering "may this
user see nutrition?" is one fast local query rather than an API call to Stripe on
every request.

**`Search`** — one row per search performed. Append-only: it is a log, not a
unique list. Duplicates are collapsed when *read*.

| Term | Meaning |
|---|---|
| **Primary key (PK)** | Uniquely identifies a row. Ours are `INT AUTO_INCREMENT` |
| **Foreign key (FK)** | Points at another table's primary key. MySQL refuses a `Search.userId` with no matching `User.id`, so orphaned rows cannot exist |
| **Unique index (U)** | No two rows share the value. `stripeSubscriptionId` is unique so a webhook matches exactly one row |
| **Index** | Makes a common query fast. `Search(userId, createdAt)` matches "this user's searches, newest first" |
| **`ON DELETE CASCADE`** | Deleting a user deletes their searches and subscriptions too |

### Prisma and Workbench are two doors into the same database

```text
Application code
      |  prisma.user.findMany()
      v
   Prisma            translates method calls into SQL
      |  SELECT * FROM User
      v
   MySQL             stores the data
      ^
      |  SQL typed by hand
MySQL Workbench
```

Prisma is how the *application* reads and writes. Workbench is how *you* inspect
the result. Using Prisma does not remove the need to understand MySQL.

### Inspecting it

```sql
USE food_finder;

SHOW TABLES;
DESCRIBE user;
SELECT * FROM user;
SELECT * FROM search ORDER BY createdAt DESC LIMIT 10;
SELECT * FROM subscription;

-- foreign keys and indexes
SHOW CREATE TABLE search;
```

### Commands, all from `backend/`

| Command | What it does |
|---|---|
| `npm run db:deploy` | Applies existing migrations (use this on a fresh clone) |
| `npm run db:migrate` | Creates **and** applies a new migration after a schema change |
| `npm run db:seed` | Inserts the demo user; safe to repeat |
| `npm run db:studio` | Browser-based table viewer |
| `npx prisma migrate status` | Which migrations have been applied |
| `npx prisma generate` | Regenerates the typed client (also runs on `npm install`) |
| `npx prisma migrate reset` | ⚠️ Drops everything, re-applies migrations, re-seeds |

Refresh the **SCHEMAS** sidebar in Workbench after a migration.

---

## Internationalization

Two separate problems, handled differently.

### Interface text — ours to translate

Every visible string lives in `frontend/src/lib/i18n/translations.ts`: 51 strings
in each of four languages. Components call `t("key")`; the chosen language is
stored in `localStorage` and read through React Context.

TypeScript enforces completeness. English defines the keys, and the other three
are typed `Record<TranslationKey, string>` — so a missing German string **fails
the build** rather than showing a blank on screen.

No i18n library. `next-intl` requires `[locale]` URL routing, which restructures
the whole app; `react-i18next` is a large dependency. For 51 strings a dictionary
and a `t()` function are less code and entirely explainable.

Sentences with values use placeholders — `"{count} van {total} resultaten"` —
because word order differs per language. A test asserts every placeholder
survives translation in every language.

### Product names — not ours to translate

We ask Open Food Facts for a language and use what exists. We never invent a
translation.

Open Food Facts does not have every product in every language. Measured on a
live search for "chocolate" requesting Dutch: **only 5 of 20 names were actually
Dutch** — the rest were French, English, Spanish and Italian.

So each product reports which language its name is *really* in:

```json
{ "name": "Fourrés Chocolat Noir", "nameLanguage": "fr" }
```

When that differs from the language you chose, the card shows a small `FR` badge
explaining the product has no name in the selected language. The alternative —
silently presenting French text as Dutch — would be a lie.

Number formatting follows the language too: `129,160` in English, `129.160` in
Dutch and German, `129 160` in French.

### The language selector

A plain `<select>`, chosen manually. There is **no** automatic detection: the
assignment requires an explicit choice, and auto-detection surprises people
(a Dutch speaker on a German laptop gets German with no obvious way out).

Changing language re-runs the current search, so product names update too.

---

## Subscriptions

### The flow

```text
User clicks Subscribe
      |
      v
POST /checkout/session          backend creates a Stripe Checkout Session
      |                         (card details never touch our server)
      v
checkout.stripe.com             user pays with test card 4242 4242 4242 4242
      |
      v
back to our page                "Payment received, confirming…"
      |                          <-- NOT "you are subscribed"
      v
Stripe  ->  POST /stripe/webhook    signature verified, subscription row written
      |
      v
access granted
```

### Why returning from Checkout proves nothing

`success_url` is an ordinary URL. Anyone can type it, bookmark it, or share it.
A user can also close the tab before paying, or the card can fail after the
redirect.

So the page shows "confirming…" and polls the server. The subscription becomes
real only when **Stripe tells our server**, in a request we verify
cryptographically.

### Webhooks

`POST /stripe/webhook` is publicly reachable, so every request is verified
against `STRIPE_WEBHOOK_SECRET` before a single field is read. Without that check
the endpoint would be a free-subscription button.

Verification needs the **raw** request body — Stripe signs exact bytes, and
re-serialising parsed JSON produces different ones. `app.ts` therefore registers
`express.raw()` for that one path *before* `express.json()`. That ordering is
load-bearing.

Status codes are instructions to Stripe: `200` understood, `400` never retry
(unverifiable), `500` please retry (we failed, the payment is real).

Every write is an upsert keyed on Stripe's subscription id, so a replayed event
produces an identical row rather than a duplicate.

### Local subscription state

| Stripe status | Access | Why |
|---|---|---|
| `active`, `trialing` | ✅ | Paid and current |
| `active` + `cancelAtPeriodEnd` | ✅ | They paid for the remaining time |
| `active` but period **expired** | ❌ | Safety net against a webhook we never received |
| `past_due`, `unpaid`, `incomplete`, `canceled`, `paused` | ❌ | Not currently paid for |

Access is granted if **any** subscription row is live, not just the newest —
webhooks can arrive out of order, so "most recently inserted" is not reliably
"current subscription".

### Backend authorization

Three separate layers, because they change for different reasons:

| Layer | File | Question |
|---|---|---|
| Identity | `user.service.ts` | Who is this? |
| Subscription | `subscription.service.ts` | What does Stripe say? |
| Access | `access.service.ts` | What may they see? |

The enforcement is one line in `product.controller.ts`:

```ts
nutrition: canViewNutrition ? product.nutrition : null,
```

Values are not blanked or zeroed — they are **never serialised**. An unentitled
caller receives a response that does not contain them.

Nothing the caller sends can influence this. `access.service.ts` and
`subscription.service.ts` contain zero references to `req.query`, `req.headers`,
`req.body` or `req.cookies`. Verified against ten bypass attempts — forged
`?nutrition=true`, `?userId=1`, `Authorization` and `x-subscribed` headers,
cookies — all returned products with no nutritional values.

It also **fails closed**: if the database is unreachable we cannot prove
entitlement, so nutrition is withheld while search keeps working.

---

## Technical decisions

Forty-two decisions are recorded with their reasoning in
[`DECISIONS.md`](DECISIONS.md). The ones most likely to raise an eyebrow:

**The legacy Open Food Facts endpoint.** Search uses `/cgi/search.pl`, not the
newer `/api/v2/search`. v2 silently *ignores* free-text terms — searching
"nutella" returned unrelated products and a count of 4.7 million. It would have
looked like it worked while returning nonsense.

**Transforming the API response instead of forwarding it.** 200+ fields become 9.
`null` always means "missing", where upstream uses `""`, absent fields and
numbers-written-as-text interchangeably. And it is what makes withholding
nutrition possible at all.

**No authentication.** The assignment specifies one demo user. The property that
matters is that the **backend** decides who the user is — no endpoint accepts a
user id from the browser, so there is nothing to tamper with.

**Products with neither a name nor a brand are dropped.** They would render as
blank cards; about one in five real "milk" results has no usable name. This is
why `totalCount` is larger than the number of products returned.

**Upstream error messages never reach the caller.** A security test caught a
connection string with a password reaching the HTTP response, because a
third-party error message had been interpolated into ours. Details now go to the
log; callers get a sentence we wrote.

---

## Known limitations

Stated plainly rather than glossed over.

- **One shared demo user.** Everyone using a deployment shares one account and
  one search history. There is no login.
- **No rate limiting.** `/products/search` proxies to an API that allows ~10
  searches per minute, so an abusive caller could exhaust that budget for
  everyone. Needs a dependency and a policy; not done.
- **No test covers real SQL.** Prisma is replaced with a spy in the test suite.
  The queries themselves were verified by hand in MySQL Workbench. A fuller
  project would add a throwaway test database.
- **The layout-overflow test is weak.** jsdom cannot measure layout, so it
  asserts the CSS classes are present rather than that nothing overflows.
- **Four `npm audit` advisories remain**, all in the `prisma` CLI — a
  devDependency used for migrations, never in the request path. The only offered
  fix is downgrading Prisma 7 → 6. Runtime dependencies are at zero.
- **Nutri-Score is public.** The a–e grade is returned to everyone. It is printed
  on the physical packaging, so it reads as a public label rather than "detailed
  nutritional information" — but it is a judgement call, and reasonable people
  could disagree.
- **Local development only.** No deployment configuration, no HTTPS, no
  production hardening beyond hiding internal errors and two response headers.
- **Windows lower-cases table names.** The schema defines `User`; Windows MySQL
  stores it as `user` (`lower_case_table_names=1`). Queries work either way here,
  but a dump taken on Windows needs care before restoring on Linux.
- **Open Food Facts is slow and rate-limited.** Real searches take 3–20 seconds
  and intermittently return 503. The interface is built around that; it is not a
  bug in this code.

---

## Project layout

```text
food-finder/
├── package.json              convenience scripts that run both halves
├── README.md                 this file
├── DECISIONS.md              42 technical decisions, with reasoning
│
├── backend/
│   ├── API.md                the full API contract
│   ├── db/                   one-off SQL to create the database and its user
│   ├── prisma/
│   │   ├── schema.prisma     the database, described once
│   │   ├── migrations/       the SQL actually applied
│   │   └── seed.ts           creates the demo user
│   ├── src/
│   │   ├── app.ts            builds the Express app (middleware order matters here)
│   │   ├── index.ts          starts the server — nothing else
│   │   ├── config/env.ts     every environment variable, read and validated once
│   │   ├── routes/           which URL maps to which handler
│   │   ├── controllers/      read the request, shape the response
│   │   ├── services/         the actual work
│   │   │   ├── openFoodFacts.service.ts   the only file that knows about OFF
│   │   │   ├── access.service.ts          the access rule
│   │   │   └── webhook.service.ts         Stripe events -> database
│   │   ├── errors/           AppError and the database guard
│   │   └── scripts/          diagnostics: try:search, stripe:check
│   └── tests/                60 tests
│
└── frontend/
    ├── src/app/page.tsx      owns all page state
    ├── src/components/       presentational; no state of their own
    ├── src/lib/api.ts        the only file that calls fetch
    ├── src/lib/i18n/         translations and the language provider
    └── tests/                50 tests
```

### Where to look first

| Question | File |
|---|---|
| How is nutrition protected? | `backend/src/controllers/product.controller.ts` (the `canViewNutrition` line) |
| What counts as an active subscription? | `backend/src/services/subscription.service.ts` |
| How is Open Food Facts data cleaned up? | `backend/src/services/openFoodFacts.service.ts` |
| Why is a webhook trusted? | `backend/src/controllers/webhook.controller.ts` |
| What does the API return? | `backend/API.md` |
| Why was something done that way? | `DECISIONS.md` |
