# Deploying on Vercel

The app runs on Vercel with a Postgres database from Neon (added through
Vercel). Each deploy sets up or updates the database by itself (see
`src/db/deploy-setup.ts`), so after the steps below you only redeploy.

Until the settings are in place the site shows "This site is not set up yet"
with the names of the settings still missing.

## One-time setup

1. **Add the database.** In the Vercel project: **Storage** → **Create
   Database** → **Neon** → follow the steps and connect it to this project for
   all environments. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
   - Recommended: turn on Neon's **preview branches** ("create a database
     branch for each preview deployment"). Then every preview link gets its own
     copy of the database, and changes in an unmerged pull request never touch
     the main one.
2. **Add the settings.** **Settings** → **Environment Variables**, for all
   environments:

   | Name                 | Value                                                                               |
   | -------------------- | ----------------------------------------------------------------------------------- |
   | `APP_DB_PASSWORD`    | A long random password (a password manager can make one). Never reuse it.           |
   | `BETTER_AUTH_SECRET` | Another long random text, at least 32 characters. Signs sign-in cookies.            |
   | `DEMO_SEED`          | `1` to add the FAKE demo school. Leave it out on a real school's site.              |
   | `SEED_PASSWORD`      | Only with `DEMO_SEED=1`: the password for the demo accounts, at least 8 characters. |
   | `BETTER_AUTH_URL`    | Optional: only for a custom domain, e.g. `https://school.example.com`.              |

3. **Production branch.** **Settings** → **Git** → **Production Branch**: the
   branch pull requests are merged into (currently
   `claude/intelligent-franklin-fvzo91`).
4. **Redeploy.** **Deployments** → the latest production deployment → **⋯** →
   **Redeploy**. The build log shows "Applying database migrations…" and
   "Database setup done."
5. **Sign in** (demo site): phone `024 100 0001` (admin), `024 100 0002`
   (bursar) or email `teacher@demo-school.test`, with your `SEED_PASSWORD`.

## How it fits together

- The running app always connects as the restricted `skool_app` database
  role, which row-level security keeps to one school at a time. With
  `APP_DB_PASSWORD` set, the deploy gives `skool_app` that password and the app
  signs in with it on Neon's host. The app refuses to start as the database
  owner, which row-level security does not limit.
- Migrations and the demo seed run as the owner (`DATABASE_URL_UNPOOLED`, or
  `DATABASE_ADMIN_URL` if set) during the build, never while the site runs.
- Without Neon preview branches, preview deployments share the main database
  and a pull request's migrations apply to it when its preview builds. Fine for
  a demo with fake data; turn preview branches on before real school data.
- Design previews (`/preview/dashboard`, `/dev/components`) show only on
  preview links, never on the production address.

## Before real school data

- Do not set `DEMO_SEED`. Create the school and first admin account
  deliberately (a later milestone adds onboarding).
- Turn on Neon backups/point-in-time restore on a paid plan, and keep
  `APP_DB_PASSWORD` and `BETTER_AUTH_SECRET` only in Vercel.
