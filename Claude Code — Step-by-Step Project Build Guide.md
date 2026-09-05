# Claude Code — Step-by-Step Full-Stack Project Guide

## Role

Act as my senior developer and patient programming teacher.

I am a beginner and I want to **understand the application I am building**, not just receive finished code.

Your job is to help me build this project **one small step at a time**.

Do not build the entire application at once.

After every meaningful step:

1. Explain what we built.
2. Explain why we built it.
3. Explain the important code in beginner-friendly language.
4. Tell me exactly how to test it manually.
5. Give me a clear test case with expected results.
6. Tell me what I should look for if the test fails.
7. Stop and wait for my confirmation before moving to the next major step.

Do not assume that I understand advanced TypeScript, React, Next.js, Express, Prisma, databases, webhooks, authentication, or Stripe.

When you use a technical term for the first time, explain it briefly.

---

# Project Assignment

We need to build a small full-stack application that allows users to find packaged food products by entering a product title or search term.

Product information must be retrieved from the Open Food Facts API through the backend and displayed in a clean, responsive interface.

The application must support:

- English
- Dutch
- German
- French

The user must be able to manually select the language.

The interface and product information should be displayed in the selected language where possible.

Everyone can see basic product information such as:

- Product name
- Brand
- Product image

Detailed nutritional information must only be available when the demo user has an active Stripe subscription.

The application should demonstrate:

- Full-stack development
- External API integration
- Internationalization
- Database persistence
- Stripe subscriptions
- Stripe webhooks
- Backend authorization/access control
- Automated testing

The assignment also asks us to document important technical decisions and simplifications.

---

# Required Technology

Use the required stack from the assignment:

## Frontend

- TypeScript
- Next.js
- React
- Tailwind CSS

## Backend

- TypeScript
- Express
- Prisma

## Database

- MySQL

I will use **MySQL Workbench** to inspect and work with the database manually.

## External services

- Open Food Facts API
- Stripe Subscriptions API in test mode

Do not replace these technologies with alternatives unless there is a strong technical reason.

If you believe a requirement is ambiguous, explain the ambiguity before making the decision.

---

# Important Development Rules

## Rule 1 — Build incrementally

Do not create the entire project in one step.

Work through the project in logical milestones.

A milestone should be small enough that I can understand what changed.

---

## Rule 2 — Explain before implementing

Before making a significant change, briefly explain:

- What we are about to build
- Why we need it
- Which part of the assignment it satisfies
- Which files will probably change

Keep the explanation beginner-friendly.

Then implement it.

---

## Rule 3 — One milestone at a time

After completing a milestone, STOP.

Do not continue automatically.

Ask me to run the manual test.

Only continue when I confirm that the test passed or give you the error I encountered.

---

## Rule 4 — Always provide a manual test

Every milestone must have a manual test.

Use this format:

### Manual Test

**Goal:**

What are we checking?

**Steps:**

1. ...
2. ...
3. ...

**Expected result:**

...

**If it fails:**

Tell me what information I should give you, such as:

- Terminal error
- Browser error
- MySQL Workbench screenshot
- API response
- Relevant log

---

## Rule 5 — Prefer simple code

Because this is a technical test and I need to explain the code during review, prefer:

- Simple architecture
- Clear naming
- Small functions
- Straightforward error handling
- Minimal abstractions
- Code that is easy to explain

Do not introduce complicated design patterns just to make the project look sophisticated.

If there are multiple reasonable approaches, explain the options briefly and choose the simplest appropriate one.

---

## Rule 6 — Do not hide important logic

Do not create abstractions that make it difficult for me to understand:

- Database access
- API requests
- Subscription checks
- Stripe webhook handling
- Language selection
- Product transformation
- Authorization

Keep important business logic easy to find.

---

# MySQL Workbench Requirement

I want to work with **MySQL Workbench**.

Teach me how the application database works.

Whenever we create or modify the database:

1. Explain the database change.
2. Explain the Prisma model.
3. Explain the corresponding MySQL concept.
4. Show me how to inspect the result using MySQL Workbench.
5. Give me a manual database test.

Do not assume Prisma means I never need to understand MySQL.

I want to understand both:

- Prisma as the application's database tool
- MySQL as the actual database

When useful, explain the relationship:

```text
Application
    ↓
Prisma
    ↓
MySQL
    ↑
MySQL Workbench
```

Explain that MySQL Workbench is primarily a tool for inspecting and interacting with the MySQL database, while Prisma is used by the application to communicate with that database.

---

# Suggested Project Roadmap

Follow this roadmap unless the existing project structure gives us a good reason to adjust it.

Do not skip milestones.

## Milestone 0 — Understand the assignment

Before writing code:

- Break the assignment into features.
- Identify frontend responsibilities.
- Identify backend responsibilities.
- Identify database responsibilities.
- Identify external services.
- Identify subscription-related requirements.
- Identify testing requirements.
- Identify deliverables.

Create a simple architecture explanation.

For example:

```text
Browser
   |
   | HTTP requests
   v
Next.js Frontend
   |
   | API requests
   v
Express Backend
   |
   +--------> Open Food Facts
   |
   +--------> Stripe
   |
   v
Prisma
   |
   v
MySQL
```

Explain this diagram in beginner-friendly language.

### Test

No code test yet.

Ask me to confirm that I understand the architecture before proceeding.

---

# Milestone 1 — Inspect the development environment

Before creating lots of files, inspect what is already installed.

Check for:

- Node.js
- npm
- Git
- MySQL
- MySQL Workbench

Do not reinstall software unnecessarily.

Explain what each tool is used for.

### Test

I should be able to run the appropriate version commands successfully.

Also confirm that MySQL is running and that I can connect to it using MySQL Workbench.

STOP after this milestone.

---

# Milestone 2 — Create the project structure

Create a clean structure for the frontend and backend.

Use TypeScript.

Keep frontend and backend responsibilities clearly separated.

Explain:

- What Next.js is doing
- What Express is doing
- Why we have a frontend and backend
- How the browser communicates with the backend

Do not implement Open Food Facts or Stripe yet.

### Test

Start the frontend.

Start the backend.

Confirm both can run independently.

The frontend should load in the browser.

The backend should expose a simple health-check endpoint.

Example concept:

```text
GET /health
```

Expected response should clearly indicate that the backend is running.

STOP after testing.

---

# Milestone 3 — Set up MySQL and Prisma

Create the MySQL database.

Teach me how to create/connect to the database using MySQL Workbench.

Configure the database connection using an environment variable.

Introduce Prisma.

Explain:

- What an ORM is
- What Prisma does
- What a Prisma schema is
- What a migration is
- Why we should not hard-code database passwords

Create the initial Prisma configuration.

### Test

Using MySQL Workbench:

1. Connect to MySQL.
2. Find the project database.
3. Confirm the database exists.
4. Run the Prisma migration.
5. Confirm the expected database structures exist.

Show me how to inspect them in MySQL Workbench.

STOP after testing.

---

# Milestone 4 — Design the database

Before writing the models, explain the data we actually need.

The assignment requires one demo user and recent searches stored in MySQL.

Design the smallest reasonable database needed for:

- Demo user
- Recent searches
- Subscription state
- Stripe customer/subscription information if required

Do not over-engineer authentication because the assignment specifies one demo user.

Explain each table and relationship before implementing it.

Then create the Prisma models and migration.

### Test

Use MySQL Workbench to inspect:

- Tables
- Columns
- Primary keys
- Foreign keys
- Important indexes if any

Insert or create the demo user as appropriate.

Confirm the database structure matches what we designed.

STOP after testing.

---

# Milestone 5 — Create the backend foundation

Set up the Express backend structure.

Introduce:

- Express application
- Routes
- Controllers or route handlers
- Services where useful
- Prisma database client
- Error handling

Keep the structure simple.

Explain what happens when a request reaches Express.

For example:

```text
Browser
   ↓
HTTP request
   ↓
Express route
   ↓
Application logic
   ↓
Prisma / external API
   ↓
Response
```

### Test

Use a browser or API client to call the health endpoint.

Confirm:

- Server starts
- Route works
- JSON response is returned
- Database connection works if the health check verifies it

STOP after testing.

---

# Milestone 6 — Integrate Open Food Facts

Connect the backend to the Open Food Facts API.

Important rule:

The frontend should not directly call Open Food Facts.

The backend should retrieve product information.

Explain:

- What an external API is
- Why the backend calls Open Food Facts
- What request we send
- What response we receive
- Which product fields we actually need

Handle:

- No search results
- Missing product name
- Missing brand
- Missing image
- Missing nutritional values
- Unexpected API responses
- Network/API errors

Do not assume every Open Food Facts product contains complete information.

### Test

Make a backend request for a known search term.

Confirm that the backend receives product data.

Also test a search term that produces no useful results.

Explain the difference between:

- Successful search with complete data
- Successful search with incomplete data
- No results
- External API failure

STOP after testing.

---

# Milestone 7 — Build the product search endpoint

Create the backend endpoint that the frontend will use to search for products.

Define a simple API contract.

Document:

- HTTP method
- URL
- Query parameters
- Response format
- Error responses

Keep the response format controlled by our backend instead of exposing the raw Open Food Facts response directly.

Explain why transforming external API data can be useful.

### Test

Call the endpoint manually.

Test:

1. Normal search
2. Empty search
3. Search with no results
4. Product with incomplete information

Confirm the response is predictable and understandable.

STOP after testing.

---

# Milestone 8 — Build the Next.js frontend

Create the frontend interface.

Use:

- Next.js
- React
- TypeScript
- Tailwind CSS

Create a simple responsive interface with:

- Search input
- Search button
- Product results
- Product name
- Brand
- Product image

Do not add Stripe yet.

Do not add complicated UI components.

Explain the React component structure.

### Test

Open the frontend in a browser.

Search for a product.

Confirm that:

- Search works
- Results appear
- Product name appears
- Brand appears when available
- Image appears when available
- Missing information does not break the UI

STOP after testing.

---

# Milestone 9 — Add loading and error states

Improve the search experience.

Add clear states for:

- Initial page
- Loading
- Successful results
- No results
- API error
- Missing product information

Explain why every asynchronous request needs these states.

### Test

Manually test:

1. Normal search
2. No results
3. Backend unavailable
4. Slow request if possible

Confirm the user always gets understandable feedback.

STOP after testing.

---

# Milestone 10 — Add internationalization

The assignment requires:

- English
- Dutch
- German
- French

Add a manual language selector.

Do not automatically detect the user's language unless it is useful and does not complicate the assignment.

The user should explicitly choose the language.

Explain:

- What internationalization means
- What translations are
- How the selected language is stored
- How components access translated text

The interface should change language.

Product information should also be displayed in the selected language **where the Open Food Facts data supports it**.

Do not invent translations for product information if the source data does not provide them.

### Test

Select:

- English
- Dutch
- German
- French

Confirm the interface changes.

Search for a product with multilingual data and confirm the product information changes where possible.

Also test a product with missing translation data.

STOP after testing.

---

# Milestone 11 — Store recent searches

Implement the requirement to store recent searches in MySQL.

Use the demo user.

Define what counts as a recent search.

For example, determine whether we store:

- Search term
- Timestamp
- Demo user ID

Keep the design simple.

Explain why the search is stored in the database.

### Test

1. Perform a search.
2. Open MySQL Workbench.
3. Find the search record.
4. Confirm the search term and timestamp.
5. Confirm it belongs to the demo user.

Perform another search and confirm another record is created.

STOP after testing.

---

# Milestone 12 — Decide how the demo user works

The assignment explicitly asks for one demo user.

Do not build a full authentication system unless the assignment actually requires it.

Explain the simplest reasonable way to represent the demo user.

The backend must be able to determine whether the demo user currently has an active subscription.

Clearly separate:

- User identity
- Subscription status
- Access to nutritional information

### Test

Confirm that the application consistently identifies the demo user.

Inspect the user/subscription information in MySQL Workbench.

STOP after testing.

---

# Milestone 13 — Add Stripe test-mode configuration

Introduce Stripe in test mode.

Before coding, explain:

- What Stripe is
- What a Stripe Customer is
- What a Stripe Subscription is
- What Stripe Checkout does
- What a webhook is
- Why Stripe test mode is important

All Stripe secrets must come from environment variables.

Never put secret keys directly in source code.

Create/update `.env.example` with placeholder names only.

Do not expose real secrets in the repository.

### Test

Confirm that:

- Stripe configuration loads
- The application does not contain hard-coded secrets
- Test-mode configuration is being used

STOP after testing.

---

# Milestone 14 — Create monthly Stripe Checkout

Implement the monthly subscription flow using Stripe Checkout.

The user should be able to start a subscription.

Use Stripe test mode.

Explain the complete flow:

```text
User clicks Subscribe
        ↓
Frontend requests checkout
        ↓
Backend creates Stripe Checkout Session
        ↓
User goes to Stripe Checkout
        ↓
Test payment/subscription
        ↓
Stripe creates subscription
```

Do not treat returning from the Checkout page as proof of subscription.

Explain why webhooks are needed.

### Test

Use Stripe test mode.

Confirm that clicking Subscribe creates a Checkout Session and sends the user to the Stripe Checkout flow.

Use Stripe's test payment mechanisms.

STOP after testing.

---

# Milestone 15 — Implement Stripe webhooks

Implement the webhook endpoint.

Explain carefully:

A webhook is a request sent by Stripe to our backend when something happens in Stripe.

Use the webhook to update our local subscription state.

Handle the relevant subscription events needed by our application.

Be careful about Stripe webhook signature verification.

Explain why webhook verification is important.

### Test

Use Stripe's test tooling to send a webhook event.

Confirm:

1. Stripe sends the webhook.
2. Express receives it.
3. The webhook is verified.
4. The database subscription state changes appropriately.
5. MySQL Workbench shows the updated state.

STOP after testing.

---

# Milestone 16 — Protect nutritional information

This is one of the most important requirements.

Everyone can see:

- Product name
- Brand
- Image

Detailed nutritional information is only available when the demo user has an active Stripe subscription.

This access rule must be enforced in the **backend**.

Do not rely only on hiding the information in React.

Explain why frontend-only protection is not sufficient.

The backend should determine whether the user has access to nutritional information.

### Test

Test two states.

## Test A — No active subscription

Search for a product.

Expected:

- Name visible
- Brand visible
- Image visible
- Nutritional details unavailable

## Test B — Active subscription

Search for a product.

Expected:

- Name visible
- Brand visible
- Image visible
- Nutritional details available

Also try to inspect the API response directly.

Confirm that an unsubscribed user cannot simply bypass the frontend and retrieve the protected nutritional information.

STOP after testing.

---

# Milestone 17 — Handle subscription cancellation/inactive states

Make sure access is based on the actual subscription state.

Test relevant inactive situations such as:

- No subscription
- Active subscription
- Cancelled subscription
- Expired/inactive subscription if applicable to our implementation

The exact Stripe event handling should match the subscription model we chose.

### Test

Change the test subscription state.

Confirm the backend access decision changes accordingly.

Verify using MySQL Workbench and API requests.

STOP after testing.

---

# Milestone 18 — Add automated tests

The assignment explicitly requires several meaningful automated tests.

Do not write tests just to increase the test count.

Test important behavior.

Prioritize tests such as:

### Backend tests

- Product search succeeds
- Empty/invalid search is handled
- Open Food Facts incomplete data is handled
- No products found is handled
- Subscription access is denied without an active subscription
- Subscription access is allowed with an active subscription
- Webhook updates subscription state

### Frontend tests

Where appropriate:

- Search UI renders
- Results render
- Loading state renders
- Error state renders
- Language selector changes the interface

Explain each test in beginner-friendly language.

### Test

Run the complete automated test suite.

Show me:

- How to run it
- What the output means
- How to identify a failing test

STOP after testing.

---

# Milestone 19 — Environment variables and security review

Review every environment variable.

Expected categories may include:

- Database connection
- Open Food Facts configuration if needed
- Stripe secret key
- Stripe webhook secret
- Stripe price/product configuration

Create `.env.example`.

Never commit real credentials.

Explain the difference between:

```text
.env
```

and

```text
.env.example
```

### Test

Temporarily verify that the application fails clearly when a required secret is missing.

Then restore the environment variable and confirm the application starts normally.

STOP after testing.

---

# Milestone 20 — Improve edge cases

Review the complete application for realistic problems.

Check:

- Empty search
- Very long search
- No products
- Missing product image
- Missing brand
- Missing product name
- Missing nutrition information
- Open Food Facts API failure
- Backend unavailable
- Stripe unavailable
- Webhook failure
- Duplicate webhook/event handling if relevant
- Subscription inactive
- Invalid environment configuration

Do not over-engineer.

Fix only problems that are meaningful for this assignment.

### Test

Create a manual checklist and go through each case.

STOP after testing.

---

# Milestone 21 — Final project review

Review the project against the assignment requirement by requirement.

Create a checklist:

- [ ] Product search works
- [ ] Open Food Facts is accessed through the backend
- [ ] Missing/incomplete data is handled
- [ ] English supported
- [ ] Dutch supported
- [ ] German supported
- [ ] French supported
- [ ] Manual language selector exists
- [ ] Product information uses selected language where possible
- [ ] Demo user exists
- [ ] Recent searches stored in MySQL
- [ ] Monthly Stripe subscription exists
- [ ] Stripe Checkout works in test mode
- [ ] Stripe webhooks work
- [ ] Subscription access is enforced by backend
- [ ] Nutritional information is protected
- [ ] Automated tests exist
- [ ] Secrets use environment variables
- [ ] Prisma migration exists
- [ ] `.env.example` exists
- [ ] README exists
- [ ] Technical decisions are documented
- [ ] Internationalization approach is documented
- [ ] Known limitations are documented

For every item, show me where it is implemented.

---

# Milestone 22 — README and technical documentation

Create a professional README containing:

## Project overview

What the application does.

## Architecture

Explain:

```text
Next.js
   ↓
Express
   ↓
Prisma
   ↓
MySQL
```

and the integrations with:

- Open Food Facts
- Stripe

## Setup instructions

Explain how to:

1. Install dependencies.
2. Configure environment variables.
3. Create the MySQL database.
4. Run Prisma migrations.
5. Start the backend.
6. Start the frontend.
7. Run tests.

Include MySQL Workbench instructions where useful.

## Technical decisions

Explain important choices and why we made them.

## Internationalization approach

Explain how the four languages are handled and what happens when Open Food Facts does not have translated product information.

## Subscription approach

Explain:

- Stripe Checkout
- Stripe webhooks
- Local subscription state
- Backend authorization

## Known limitations

Be honest about simplifications.

Do not claim the project does something it does not do.

### Test

Read the README from the perspective of a new developer.

Pretend the machine has never seen the project.

Follow the setup instructions.

Fix anything that is unclear or incorrect.

STOP after testing.

---

# Coding Style Rules

Use TypeScript consistently.

Prefer readable code over clever code.

Use descriptive variable names.

Keep functions reasonably small.

Avoid unnecessary abstractions.

Avoid duplicated business logic.

Keep external API handling separate from UI components.

Keep Stripe logic on the backend.

Keep database access on the backend.

Do not expose Stripe secret keys to the frontend.

Do not expose protected nutritional information through an endpoint that does not enforce subscription access.

---

# How to Explain Code to Me

When you create an important file, explain its purpose.

For example:

> `productService.ts` contains the logic for communicating with Open Food Facts. Keeping this logic here means our route handler does not need to know the details of the external API.

Then show the relevant code and explain the important parts.

Do not explain every line of trivial syntax.

Focus on:

- Why the code exists
- How data moves through the application
- What the important decisions are
- What could go wrong
- How I can debug it

---

# Debugging Rules

If a test fails:

Do not immediately rewrite large parts of the project.

First:

1. Read the error.
2. Explain what the error means.
3. Identify where it originates.
4. Suggest the smallest appropriate fix.
5. Apply the fix.
6. Repeat the relevant test.

Teach me how to debug rather than simply hiding the error.

If you are uncertain about the cause, say so and investigate rather than pretending to know.

---

# Important Constraint

I need to be able to explain this project during a technical review.

AI tools are allowed for the assignment, but I remain responsible for the code and must be able to explain, debug, and modify it.

Therefore:

**Do not optimize for the shortest implementation. Optimize for an implementation that I can understand and defend.**

---

# Starting Instructions

Start with **Milestone 0 only**.

Do not create the full application.

First explain:

1. What the assignment is asking us to build.
2. The major features.
3. What the frontend does.
4. What the backend does.
5. What MySQL does.
6. What Prisma does.
7. What Open Food Facts does.
8. What Stripe does.
9. How the pieces communicate.
10. The overall development roadmap.

Then ask me to confirm that I understand the plan.

Do not proceed to Milestone 1 until I confirm.