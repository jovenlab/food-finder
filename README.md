# Food Finder

A small full-stack application for searching packaged food products. Users type a
product name, the backend fetches matching products from the
[Open Food Facts](https://world.openfoodfacts.org/) API, and the results are shown
in a responsive interface available in English, Dutch, German and French.

Basic product information (name, brand, image) is public. **Detailed nutritional
information is only available when the demo user holds an active Stripe
subscription**, and that rule is enforced by the backend rather than by hiding
elements in the UI.

> **Status: in development.** This README is written alongside the work, so it
> describes what actually exists today. See [Current status](#current-status) for
> exactly which parts are built and which are not.

---

## Table of contents

- [Architecture](#architecture)
- [Technology](#technology)
- [Current status](#current-status)
- [Project structure](#project-structure)
- [Setup](#setup)
- [Running the application](#running-the-application)
- [Environment variables](#environment-variables)
- [Database schema](#database-schema)
- [Working with the database](#working-with-the-database)
- [Technical decisions](#technical-decisions)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)

---

## Architecture

```text
                        Browser
                           |
                           |  1. loads the page
                           v
              Next.js frontend  (localhost:3000)
                           |
                           |  2. fetch("/api/...")  - from the browser
                           v
              Express backend   (localhost:4000)
                  |         |          |
                  |         |          +--> Stripe API      (checkout, subscriptions)
                  |         |                   ^
                  |         |                   |  webhook: "subscription updated"
                  |         |                   +---------------------------+
                  |         |                                               |
                  |         +--> Open Food Facts API  (product search)      |
                  |                                                         |
                  v                                                         |
               Prisma  ---->  MySQL  <----  MySQL Workbench (manual inspection)
```

Two rules shape this diagram:

1. **The frontend never calls Open Food Facts or Stripe directly.** All external
   calls go through the backend. Anything running in the browser is visible and
   modifiable by the user, so secrets and access rules cannot live there.
2. **The browser talks to both servers; the servers do not talk to each other.**
   Next.js serves the page; the page then calls Express from the browser. This is
   why CORS configuration is required.

### Request flow for a product search

```text
Browser  ->  Express route  ->  Open Food Facts  ->  transform response
                    |                                       |
                    +-> Prisma -> MySQL (save recent search) |
                    |                                       |
                    +-> check subscription state in MySQL <--+
                    |
                    +-> respond with product data,
                        including nutrition ONLY if subscribed
```

---

## Technology

| Layer | Choice | Version |
|---|---|---|
| Frontend framework | Next.js (App Router) | 16.3.4 |
| UI library | React | 19.2.8 |
| Styling | Tailwind CSS | 4 |
| Backend framework | Express | 5.2.1 |
| Language | TypeScript | 7.0 (backend) / 5 (frontend) |
| ORM | Prisma | 7.10.0 |
| Database | MySQL | 8.0.46 |
| MySQL driver | @prisma/adapter-mariadb | 7.10.0 |
| Payments | Stripe (test mode) | not yet integrated |
| External data | Open Food Facts API | not yet integrated |

Runtime: Node.js 24.

---

## Current status

Built and verified:

- [x] Separate frontend and backend projects, both in TypeScript
- [x] Express backend with a `GET /health` endpoint
- [x] CORS configured so the browser may call the backend
- [x] Next.js frontend that reports backend connectivity
- [x] MySQL database and a dedicated, least-privilege application user
- [x] Prisma installed and connected to MySQL (connection and write access verified)
- [x] All configuration read from environment variables
- [x] Database schema designed and applied via a Prisma migration
- [x] Demo user created by a repeatable seed script

Not built yet:

- [ ] Open Food Facts integration
- [ ] Product search endpoint and search UI
- [ ] Internationalization (EN / NL / DE / FR)
- [ ] Recent searches persistence
- [ ] Stripe Checkout, webhooks, and subscription state
- [ ] Backend-enforced access control for nutritional information
- [ ] Automated tests

---

## Project structure

```text
food-finder/
├─ README.md
├─ .gitignore
├─ backend/                     Express API - the only part that holds secrets
│  ├─ src/
│  │  ├─ index.ts               Express app, middleware, routes
│  │  ├─ prisma.ts              The one shared database client
│  │  └─ generated/prisma/      Prisma's generated client - not committed
│  ├─ prisma/
│  │  ├─ schema.prisma          Database structure: User, Subscription, Search
│  │  ├─ seed.ts                Creates the demo user
│  │  └─ migrations/            Applied schema changes, as SQL
│  ├─ db/
│  │  └─ 01-create-database.sql One-time MySQL setup, run manually in Workbench
│  ├─ prisma7.config.ts         Prisma CLI config; reads DATABASE_URL from the env
│  ├─ .env                      Real secrets - git-ignored, never committed
│  ├─ .env.example              Template listing every required variable
│  └─ tsconfig.json
└─ frontend/                    Next.js UI - contains no secrets
   ├─ src/app/
   │  ├─ layout.tsx             HTML shell shared by every page
   │  ├─ page.tsx               Home page
   │  └─ globals.css            Tailwind entry point
   ├─ .env.local                Local config - git-ignored
   └─ .env.example
```

---

## Setup

### Prerequisites

- Node.js 20 or newer (developed on 24)
- MySQL Server 8.0, running
- MySQL Workbench (used for all manual database inspection)
- Git

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Create the database

Open **MySQL Workbench**, connect as `root`, and open
`backend/db/01-create-database.sql`.

Before running it, replace `choose-a-strong-password` with a password of your own.
Avoid the characters `@ : / ? # %` - they have special meaning inside a connection
URL and would need escaping.

Execute the whole script (**Ctrl+Shift+Enter**). It creates:

| Object | Purpose |
|---|---|
| `food_finder` | The application database |
| `food_finder_shadow` | Scratch database Prisma uses to validate migrations |
| `food_finder_app`@`localhost` | Application user, with rights on those two databases only |

### 3. Configure environment variables

```bash
cd backend
cp .env.example .env

cd ../frontend
cp .env.example .env.local
```

Edit `backend/.env` and put your chosen password into **both** connection URLs.

### 4. Create the tables and the demo user

```bash
cd backend
npm run db:migrate     # applies prisma/migrations - creates the three tables
npm run db:seed        # inserts the demo user
```

Expected output ends with `Demo user ready: id=1, email=demo@foodfinder.local`.

Verify at any time with:

```bash
npx prisma migrate status
```

Expected: `Datasource "db": MySQL database "food_finder" at "localhost:3306"` and
`Database schema is up to date!`.

---

## Running the application

Two terminals, one per server.

```bash
# Terminal 1 - backend on http://localhost:4000
cd backend
npm run dev
```

```bash
# Terminal 2 - frontend on http://localhost:3000
cd frontend
npm run dev
```

Then open <http://localhost:3000>. The page shows a **"Backend is online"** panel
when it can reach the API.

### Health check

```bash
curl http://localhost:4000/health
```

```json
{ "status": "ok", "service": "food-finder-backend", "timestamp": "..." }
```

### Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `EADDRINUSE` on 3000 or 4000 | An orphaned dev server. Find it with `Get-NetTCPConnection -LocalPort 4000 -State Listen`, confirm with `Get-Process -Id <PID>`, then `Stop-Process -Id <PID> -Force`. |
| Page shows "Backend is not reachable" | The backend is not running, or `NEXT_PUBLIC_API_URL` points somewhere else. |
| Console shows a CORS error | `FRONTEND_ORIGIN` in `backend/.env` must exactly match the frontend origin. |
| `ERROR 1045 (28000): Access denied` | Wrong MySQL password. The server is fine - only the credentials are wrong. |
| `Can't connect to MySQL server ... 10061` | The MySQL service is stopped. Start the `MySQL80` service. |

---

## Environment variables

Real values live in `.env` files, which are **git-ignored**. Each `.env.example`
is committed so a new developer knows what is required without ever seeing a
secret.

### `backend/.env`

| Variable | Purpose |
|---|---|
| `PORT` | Port the Express server listens on (default 4000) |
| `FRONTEND_ORIGIN` | Origin allowed to call the API (CORS) |
| `DATABASE_URL` | MySQL connection string used by Prisma |
| `SHADOW_DATABASE_URL` | Scratch database used when running development migrations |

Stripe variables are added in a later milestone.

### `frontend/.env.local`

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend |

> Next.js only exposes variables prefixed with `NEXT_PUBLIC_` to the browser.
> **Never give a secret that prefix**, and never place a secret in the frontend at
> all - everything the frontend receives is readable by the user.

---

## Database schema

Three tables, created by `prisma/migrations/`.

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

**`User`** - identity only. One row: the demo user. `stripeCustomerId` is null
until the user first goes through Stripe Checkout.

**`Subscription`** - a local copy of what Stripe knows, kept current by webhooks.
Stripe remains the source of truth; this table exists so that answering "may this
user see nutrition data?" is a fast local query instead of an API call to Stripe
on every request.

**`Search`** - one row per search performed, satisfying the "store recent searches
in MySQL" requirement.

| Term | Meaning |
|---|---|
| **Primary key (PK)** | The column that uniquely identifies a row. Ours are `INT AUTO_INCREMENT`, so MySQL assigns 1, 2, 3, ... |
| **Foreign key (FK)** | A column pointing at another table's primary key. MySQL refuses to store a `Search.userId` that has no matching `User.id`, so orphaned rows cannot exist. |
| **Unique index (U)** | Guarantees no two rows share a value. `Subscription.stripeSubscriptionId` is unique so an incoming webhook matches exactly one row. |
| **Index** | A lookup structure that makes a common query fast. `Search(userId, createdAt)` matches "this user's searches, newest first". |
| **`ON DELETE CASCADE`** | Deleting a user automatically deletes their searches and subscriptions, instead of leaving rows pointing at a user that no longer exists. |

### Inspecting it in MySQL Workbench

```sql
USE food_finder;

SHOW TABLES;
DESCRIBE user;
SELECT * FROM user;
SELECT * FROM search ORDER BY createdAt DESC;

-- Foreign keys and indexes
SHOW CREATE TABLE search;
```

## Working with the database

Prisma and MySQL Workbench are two doors into the same database:

```text
Application code
      |  prisma.user.findMany()
      v
   Prisma                  translates method calls into SQL
      |  SELECT * FROM User
      v
   MySQL                   stores the data
      ^
      |  SQL typed by hand
MySQL Workbench
```

Prisma is how the *application* reads and writes data. Workbench is how *you*
inspect the result. Using Prisma does not remove the need to understand MySQL -
after every database operation the code performs, the effect can be seen directly
in Workbench.

Useful commands, all run from `backend/`:

| Command | What it does |
|---|---|
| `npm run db:migrate` | Creates and applies a migration from the current schema |
| `npm run db:seed` | Inserts the demo user (safe to run repeatedly) |
| `npm run db:studio` | Opens a browser-based table viewer |
| `npx prisma migrate status` | Shows which migrations have been applied |
| `npx prisma generate` | Regenerates the typed client after a schema change |
| `npx prisma migrate reset` | Drops everything, re-applies all migrations, re-seeds |

In Workbench, refresh the **SCHEMAS** sidebar after any migration to see the
resulting tables.

---

## Technical decisions

**Separate frontend and backend projects rather than Next.js API routes.**
Next.js can serve backend code itself, but the assignment requires Express. Two
independent projects, each with its own `package.json`, keep the boundary explicit
and make it obvious which code can hold secrets.

**Plain folders instead of an npm workspace / monorepo tool.** A workspace would
allow starting both servers with one command, at the cost of configuration that
adds no value at this size.

**A dedicated MySQL user instead of `root`.** The application connects as
`food_finder_app`, which has rights on two databases and nothing else. If those
credentials leak, the rest of the MySQL server is unaffected.

**An explicit shadow database instead of a server-wide grant.** Prisma's
documented MySQL setup asks for `CREATE, DROP, ALTER` on `*.*` so it can create a
temporary shadow database. Granting an application user permission to drop any
database on the server is unnecessary risk, so `food_finder_shadow` is created up
front and the grant is scoped to it.

**Configuration through environment variables.** No credential appears in source
code, so nothing sensitive enters git history and the same code can run against a
different database without edits.

**Prisma 7 with `prisma7.config.ts`.** Prisma 7 moves the connection URL out of
`schema.prisma` and into a config file that reads `process.env`. The schema
therefore describes structure only, and can be read and shared freely.

**A `Subscription` table rather than a boolean on `User`.** A boolean cannot say
*why* access was granted or *when* it expires, and cannot be reconciled with
Stripe. The table stores Stripe's own subscription id, so a webhook can find
exactly the row it needs to update.

**One user, many subscriptions.** Cancelling and re-subscribing produces a
brand-new subscription object in Stripe with a new id. With a one-to-one design
the webhook handler would have to decide whether to overwrite the previous row.
One-to-many makes the handler a plain "insert or update by
`stripeSubscriptionId`", and keeps the history.

**`Subscription.status` stored as text, not a database enum.** Stripe's status
values (`active`, `trialing`, `past_due`, `canceled`, ...) belong to Stripe, and
Stripe can add new ones. A MySQL `ENUM` would reject an unknown value and make the
webhook fail; text accepts whatever Stripe sends, and the application decides
which values grant access.

**Integer primary keys.** Simple, small, and readable while inspecting tables in
Workbench. UUIDs would matter if ids were exposed publicly or generated across
several machines; neither applies here.

**A seed script instead of inserting the demo user by hand.** `prisma/seed.ts`
uses an `upsert`, so it is safe to run repeatedly and any developer can recreate
an identical starting state.

**`@prisma/adapter-mariadb` as the MySQL driver.** Prisma 7 connects through a
"driver adapter" rather than a bundled engine. The MariaDB adapter is Prisma's
supported driver for MySQL 8.

*(Decisions about Open Food Facts, internationalization and Stripe are added as
those milestones are completed.)*

---

## Known limitations

- **`npm audit` reports 4 high-severity advisories** in Prisma's own dependency
  tree (`deepmerge-ts`, `mysql2`). No patched Prisma 7 release exists yet;
  `npm audit fix --force` "resolves" them by downgrading to Prisma 6, which is a
  major-version downgrade rather than a fix. The advisories are in dev-time CLI
  dependencies, and the application runs locally against a local database, so the
  practical risk here is low. Deliberately left as-is and documented rather than
  silently patched over.
- **Table names are lower-cased by MySQL on Windows.** The schema defines `User`,
  but Windows MySQL stores it as `user` (`lower_case_table_names=1`). Queries work
  either way because Windows MySQL is case-insensitive, but a dump taken here would
  need care before being restored on a case-sensitive Linux server.
- The application is designed for **local development**. There is no deployment
  configuration, HTTPS, or production hardening.
- Everything listed under [Current status](#current-status) as unbuilt is
  genuinely unbuilt. This README is updated as each part lands, and does not claim
  behaviour the code does not have.

---

## Roadmap

Development follows small, individually testable milestones.

| # | Milestone | State |
|---|---|---|
| 0 | Architecture and plan | done |
| 1 | Verify development environment | done |
| 2 | Frontend + backend project structure | done |
| 3 | MySQL database and Prisma connection | done |
| 4 | Design the database and run the first migration | done |
| 5 | Backend structure: routes, services, error handling | next |
| 6-7 | Open Food Facts integration and search endpoint | planned |
| 8-9 | Search UI, loading and error states | planned |
| 10 | Internationalization (EN / NL / DE / FR) | planned |
| 11-12 | Recent searches and the demo user | planned |
| 13-15 | Stripe configuration, Checkout, webhooks | planned |
| 16-17 | Backend-enforced access to nutritional data | planned |
| 18 | Automated tests | planned |
| 19-20 | Security review and edge cases | planned |
| 21-22 | Final review and full documentation | planned |
