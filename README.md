# School Management System (Ghana)

Low-cost, multi-tenant school management for Ghanaian schools.

- Requirements: [docs/requirements.md](docs/requirements.md)
- Contributor rules: [CLAUDE.md](CLAUDE.md)
- Dependency licenses: [docs/licenses.md](docs/licenses.md)

## Tech stack

Next.js (App Router) + React + TypeScript, PostgreSQL with Drizzle ORM,
Tailwind CSS, Vitest and Playwright. Package manager: pnpm.

## Getting started

You need **Node.js 22+**, **pnpm 10** (`corepack enable`) and **Docker**
(for the local database).

```bash
pnpm install                 # install dependencies
cp .env.example .env.local   # local settings (never commit .env files)
docker compose up -d db      # start PostgreSQL on localhost:5432
pnpm dev                     # start the app at http://localhost:3000
```

Visit http://localhost:3000/api/health. It should report `"database": "ok"`.

## Common commands

| Command                                | What it does                                                        |
| -------------------------------------- | ------------------------------------------------------------------- |
| `pnpm dev`                             | Run the app in development mode with live reload                    |
| `pnpm build` / `pnpm start`            | Production build / run it                                           |
| `pnpm test`                            | Unit tests (Vitest)                                                 |
| `pnpm test:e2e`                        | Browser tests (Playwright; needs `pnpm build` and a database first) |
| `pnpm lint`                            | Check code for problems                                             |
| `pnpm typecheck`                       | Check TypeScript types                                              |
| `pnpm format`                          | Auto-format all files                                               |
| `pnpm db:generate` / `pnpm db:migrate` | Create / apply database migrations                                  |

## Project layout

```
src/app/        pages and API routes (Next.js App Router)
src/db/         database client, table definitions and migrations
src/domain/     pure business logic (money, grading, balances) — heavily tested
src/server/     server-only code: auth, tenant scoping, permissions, audit
src/components/ shared UI components
src/styles/     global and print (A4) styles
tests/e2e/      Playwright browser tests
```
