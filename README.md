# Household Hub

A small household calendar and shopping list app built with Next.js.

## Run Locally

```powershell
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Database

The app can use either local SQLite or Supabase Postgres.

For local SQLite:

```text
DATABASE_PROVIDER="sqlite"
data/household.db
```

For Supabase Postgres:

```text
DATABASE_PROVIDER="postgres"
POSTGRES_URL="postgresql://..."
```

Local database files and `.env.local` are ignored by Git.

## Household Defaults

Copy `.env.example` to `.env.local` if you want to change the household id or display name:

```text
HOUSEHOLD_ID="home"
HOUSEHOLD_NAME="Home"
```

## Current Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- SQLite or Supabase Postgres via API routes

## Next Milestone

The next production step is adding auth so the household data can be shared securely.

The starter Supabase schema is in:

```text
database/supabase-schema.sql
```
