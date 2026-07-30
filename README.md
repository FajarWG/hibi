# Hibi

Hibi is a fresh Japanese-study app built around four focused practices: spaced repetition, guided writing, Kanji Tamago, and AI conversation.

The app is being rebuilt from Nihongo Flow, but it is a separate repository with a separate architecture. Existing Anki data will be migrated without resetting due dates.

## Current status

Phase 0 foundation is implemented:

- Next.js 16 App Router and TypeScript strict mode
- Tailwind CSS v4 and shadcn/ui on Radix
- Phosphor icons, Motion, light and dark themes
- Username and password authentication
- Global study timer with start, pause, resume, stop, auto-collapse, and persistence across refreshes
- Prisma 7 with isolated `hibi_*` tables in the shared PostgreSQL database
- Placeholder routes for Cards, Writing, Kanji, and Talk

See [PLAN.md](./PLAN.md) for the complete roadmap and [docs/design-tokens.md](./docs/design-tokens.md) for UI rules.

## Stack

- Next.js 16.2.12, React 19.2.4
- TypeScript 5.9.3
- Tailwind CSS 4.3.3
- shadcn/ui 4.16.0, Radix foundation
- Prisma 7.9.1 with `@prisma/adapter-pg`
- PostgreSQL
- Bun 1.3.13

HeroUI is intentionally not used.

## Setup

```powershell
bun install
Copy-Item .env.example .env
```

Fill `.env`:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="a-long-random-secret"
GEMINI_API_KEY=""
```

`GEMINI_API_KEY` is optional. Core study features remain available without it.

Generate the Prisma client and apply Hibi migrations:

```powershell
bun run db:generate
bun run db:migrate
bun run db:smoke
```

Start development:

```powershell
bun dev
```

## Database safety

Hibi shares a PostgreSQL database with Nihongo Flow, but every Hibi domain table uses the `hibi_` prefix.

Do **not** run `prisma migrate reset` or `prisma db push` against this database. Hibi intentionally uses `scripts/db-migrate.ts` and its own `hibi_schema_migration` ledger so it does not collide with Nihongo Flow's `_prisma_migrations` history.

Migrations are SQL files under `db/migrations/`. Never edit a migration after it has been applied. The runner verifies SHA-256 checksums and refuses changed history.

## Validation

```powershell
bun run test
bun run lint
bun run typecheck
bun run build
bun run db:smoke
```

## Project layout

```text
app/             Next.js routes and layouts
components/      shared UI and shell components
features/        feature modules (auth, timer, then SRS, Anki, Kakou, Kanji, Talk)
lib/             database, session, environment, generated Prisma client
prisma/          source Prisma schema
db/migrations/   isolated additive Hibi SQL migrations
scripts/         migration and smoke-test utilities
docs/            design and architecture decisions
```

## Repository isolation

The parent Nihongo Flow repository ignores `/hibi/`. Hibi has its own Git repository and must never be staged or committed through the parent repository.
