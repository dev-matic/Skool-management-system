# Project: School Management System for Ghana (working name: TBD)

Working rules for anyone (human or AI) contributing to this repo.
Full requirements: see `docs/requirements.md`.

## Tech stack

Next.js (App Router) + React + TypeScript, PostgreSQL + Drizzle ORM, Tailwind,
Vitest (unit/integration), Playwright (e2e), pnpm. See README for commands and
`docs/licenses.md` for version pins and their reasons.

- Money and scores: use `src/domain/money.ts` (decimal.js). Never `Number()` or
  `parseFloat` on money/scores; Postgres `numeric` arrives as a string.
- Pure business logic lives in `src/domain/` with exhaustive unit tests.
- Before committing: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
- Every protected page/server action: `getTenantContext()` or `requireRole(...)`
  first, then DB work inside `withTenant(ctx, tx => ...)`; important writes call
  `recordAudit(tx, ...)` in the same transaction. Never rely on layouts for auth.
- New school-owned tables: grant only needed privileges to `skool_app`, enable
  RLS with a `school_id = app_current_school_id()` policy, and extend the
  isolation tests. See `docs/security.md`.

## Hard rules

- Original work only. Do NOT use, fetch, copy, or imitate code, schema, or screens
  from any third-party school-management repo or tutorial (including
  safak/full-stack-school).
- Only use dependencies whose licenses allow commercial use. Record every
  dependency and its license in `docs/licenses.md` when adding it.
- Never commit secrets. Use environment variables; document them in `.env.example`.

## Architecture rules

- Multi-tenant from day one: every tenant-owned table has `school_id`; every
  query is scoped by `school_id`.
- Roles: admin, bursar, teacher, parent, student. Least-privilege access.
- Money uses decimal types (never floats). Currency is GHS.
- Automated tests are required for fee balances, grade calculations and class
  positions.
- Every important write (grades, payments, student records) is audit-logged.
- Grading scale, class/exam weighting, terms and class structure are configurable
  per school — never hardcode one scheme.
- Ghana phone numbers (+233) are validated and normalised.
- SMS goes through a provider abstraction (not built in Phase 1).

## UI rules

- Desktop-first (dense tables, keyboard-friendly, bulk actions, A4 print pages),
  but responsive enough for phones/tablets.
- Light pages; clear loading/error states; never lose data entry (autosave/drafts).
- Spreadsheet-style grids for whole-class score and attendance entry.

## Working style

- Small steps, brief explanations, ask before big choices.
- Commit often with clear messages. Add tests as you go.
