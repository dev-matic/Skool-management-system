# Security model

Student data is children's personal data (Ghana Data Protection Act, 2012).
This page explains how access is controlled. Keep it up to date.

## Accounts and roles

- One login per person (`user`), by **phone number or email** + password.
  There is no public sign-up: school administrators create accounts.
- Phone-only users get a placeholder email `<number>@phone.invalid`
  internally (the auth library needs one). It is never shown or emailed.
- Roles live on `membership` (school, user, role): admin, bursar, teacher,
  parent, student. A person may hold several roles, and roles in several schools.
- Sessions last **12 hours** (school computers are often shared).
- Failed sign-ins are limited: 5 per account and 30 per IP address per 15
  minutes. Error messages don't reveal whether an account exists.
- Deactivated users (`user.is_active = false`) cannot sign in.

## Keeping schools apart (multi-tenancy)

Every school-owned table has `school_id`. Separation is enforced twice:

1. **App layer.** Every protected page and server action starts with
   `getTenantContext()` or `requireRole(...)` (`src/server/tenant.ts`), then
   does its database work inside `withTenant(ctx, tx => ...)`.
2. **Database layer — row-level security (RLS).** `withTenant` records the
   user and school in transaction-local Postgres settings (`app.user_id`,
   `app.school_id`). RLS policies only expose rows whose `school_id` matches.
   The app connects as the restricted `skool_app` role, which is not the
   table owner and cannot bypass RLS. With no context set, school tables
   return **nothing** (fails closed).

`tests/integration/tenant-isolation.test.ts` proves a school cannot read,
change, move or delete another school's rows even when a query forgets to
filter by `school_id`.

### Rules for every new table holding school data

In its migration:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON "new_table" TO skool_app;  -- only what's needed
ALTER TABLE "new_table" ENABLE ROW LEVEL SECURITY;
CREATE POLICY new_table_tenant ON "new_table" TO skool_app
  USING (school_id = app_current_school_id())
  WITH CHECK (school_id = app_current_school_id());
```

…and add it to the isolation tests.

## Audit log

- `audit_log` records who did what, when, from which IP/browser, with
  before/after values for changed fields (`src/domain/audit-diff.ts`).
  Sensitive fields (e.g. medical notes) are recorded as `[redacted]`.
- Entries are written with `recordAudit(tx, …)` **in the same transaction** as
  the change, so they are saved together or not at all.
- It is **append-only**: the app role has only SELECT/INSERT, and a trigger
  rejects UPDATE, DELETE and TRUNCATE even for the database owner.
- Sign-in and sign-out are logged (without a school).

## Database roles

| Role                 | Used by                          | Can                                            |
| -------------------- | -------------------------------- | ---------------------------------------------- |
| owner (e.g. `skool`) | migrations, seed, backups        | everything; bypasses RLS                       |
| `skool_app`          | the running app (`DATABASE_URL`) | only granted operations, always subject to RLS |

Production passwords for both come from the server's secret store, never git.
