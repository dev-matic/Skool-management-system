# School Management System (Ghana)

Low-cost, multi-tenant school management for Ghanaian schools.

- Requirements: [docs/requirements.md](docs/requirements.md)
- Contributor rules: [CLAUDE.md](CLAUDE.md)
- Dependency licenses: [docs/licenses.md](docs/licenses.md)
- Security model (roles, school separation, audit log): [docs/security.md](docs/security.md)

## Tech stack

Next.js (App Router) + React + TypeScript, PostgreSQL with Drizzle ORM,
Tailwind CSS, Vitest and Playwright. Package manager: pnpm.

## Getting started

You need **Node.js 22+**, **pnpm 10** (`corepack enable`) and **Docker**
(for the local database).

```bash
pnpm install                 # install dependencies
cp .env.example .env.local   # local settings (never commit .env files)
                             # then set BETTER_AUTH_SECRET: openssl rand -base64 32
docker compose up -d db      # start PostgreSQL (creates app role + test database)
pnpm db:migrate              # create tables
pnpm db:seed                 # demo schools and users
pnpm dev                     # start the app at http://localhost:3000
```

Sign in with any demo account; the password is `demo-password-2026`:

| Sign in with                                 | Name          | Role(s)                                          |
| -------------------------------------------- | ------------- | ------------------------------------------------ |
| `024 100 0001` or `admin@demo-school.test`   | Akosua Mensah | Admin, Demo Basic School                         |
| `024 100 0002` (phone only)                  | Kojo Asante   | Bursar                                           |
| `024 100 0003` or `teacher@demo-school.test` | Efua Owusu    | Teacher                                          |
| `024 100 0004`                               | Yaw Boateng   | Parent                                           |
| `student@demo-school.test`                   | Abena Boateng | Student                                          |
| `024 100 0006`                               | Kwame Darko   | Admin + Teacher, and Admin at Second Demo School |
| `024 100 0007`                               | Esi Quaye     | Admin, Second Demo School only                   |

> If your Docker database was created before M1, recreate it so the app role
> and test database exist: `docker compose down -v && docker compose up -d db`.

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
tests/integration/  tests against a real Postgres (school separation, audit log)
tests/e2e/      Playwright browser tests
```
