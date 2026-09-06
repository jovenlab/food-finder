# Food Finder — frontend

The Next.js half of the project. **Setup instructions live in the
[root README](../README.md)** — this half does not run on its own, because every
request it makes goes to the Express backend.

## Quick reference

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm test           # 50 tests (Vitest + React Testing Library)
npm run test:watch
npm run lint
```

Needs `.env.local`; copy `.env.example` and read the note in it about
`NEXT_PUBLIC_` variables being visible to every visitor.

## How it is put together

```text
app/page.tsx          owns ALL page state; everything below receives props
  ├─ SearchForm       input + button
  ├─ RecentSearches   shortcuts loaded from MySQL
  ├─ SubscriptionPanel status, and the Subscribe button
  └─ ProductList
       └─ ProductCard
            └─ NutritionPanel   renders values only if the server sent them

lib/api.ts            the only file that calls fetch
lib/i18n/             51 strings × 4 languages, plus the language provider
```

Two things worth knowing before changing anything:

- **`NutritionPanel` performs no access check.** It renders whatever the backend
  chose to send. When values are missing they were never in the response — the
  decision was made on the server. A check here would be decoration.
- **Page state is one discriminated union** (`idle | loading | success | empty |
  error`), so contradictory states cannot be written down.
