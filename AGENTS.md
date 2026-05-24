<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Household Hub — agent guide

Shared household calendar and shopping list. Originally scaffolded in Codex; active development continues in Cursor.

## Repository

- **GitHub:** `https://github.com/thetoby/household-hub`
- **Production:** Vercel (deploys on push to `main`)
- **Database (production):** Supabase Postgres via Vercel integration

## Stack

- Next.js 15 (App Router), React 18, TypeScript
- Tailwind CSS v4 (`src/app/globals.css`)
- API routes under `src/app/api/`
- `better-sqlite3` (local only) or `postgres` package (Supabase)

## Architecture

| Layer | Path | Role |
|-------|------|------|
| UI | `src/app/household-hub.tsx` | Client component: calendar, shopping, settings |
| Page | `src/app/page.tsx` | Server entry; passes `initialTab` / `initialDate` |
| API | `src/app/api/calendar-events/`, `shopping-items/` | REST CRUD |
| Store | `src/lib/household-store.ts` | Switches SQLite vs Postgres by `DATABASE_PROVIDER` |
| SQLite | `src/lib/db.ts` | Dynamic import only when `DATABASE_PROVIDER=sqlite` |
| Postgres | `src/lib/postgres-db.ts` | Supabase; `ensureSchema()` on first use |
| Env | `src/lib/env.ts` | `HOUSEHOLD_ID`, `HOUSEHOLD_NAME`, `DATABASE_PROVIDER`, `POSTGRES_URL` |
| Schema reference | `database/supabase-schema.sql` | Reference SQL (runtime also creates tables in postgres-db) |

**Data flow:** UI fetches `/api/*` on mount. No placeholder seed data in the client — loading spinner until both APIs succeed, with retry on error.

## Environment

Copy `.env.example` → `.env.local` for local work.

| Variable | Local typical | Production (Vercel) |
|----------|---------------|---------------------|
| `DATABASE_PROVIDER` | `sqlite` | `postgres` |
| `POSTGRES_URL` | optional | required (from Supabase) |
| `HOUSEHOLD_ID` | `home` | `home` |
| `HOUSEHOLD_NAME` | `Home` | `Home` |

SQLite writes to `data/household.db` (gitignored). To hit the same data as production locally, use production Postgres env vars in `.env.local`.

## Commands

```powershell
npm install
npm run dev      # http://127.0.0.1:3000
npm run build
npm run lint
```

## Deployment workflow

1. Change code locally; verify with `npm run dev` and/or `npm run build`.
2. Commit and push to `main` on GitHub.
3. Vercel builds and deploys automatically.
4. Production uses Postgres; do not rely on SQLite on Vercel.

## Conventions

- Keep changes focused; match existing patterns in `household-hub.tsx` and API routes.
- Prefer extending `household-store.ts` over duplicating DB logic in routes.
- SQLite must stay behind dynamic `import("@/lib/db")` so serverless builds do not bundle `better-sqlite3` when using Postgres.
- Event types: `work`, `harlyn`, `house`, `appointment`. Shopping categories: `Food`, `House`, `Other`.
- Single household for now (`HOUSEHOLD_ID`); no auth yet.

## Next milestone

**Auth** — secure multi-user access to household data (Supabase Auth, RLS, session in API routes). See `README.md` and `database/supabase-schema.sql`.

Until auth exists, treat all API routes as public; do not add secrets to the repo.

## UI roadmap (in-app settings)

Local UI → Database → **Auth** → Deploy (deploy and database are done for production).
