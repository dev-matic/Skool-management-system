# Dependency licenses

Every dependency must allow commercial use. Add a row whenever a direct
dependency is added, and re-run the transitive check below.

## Direct dependencies

### Runtime

| Package                                | Version | License    | Purpose                                                                 |
| -------------------------------------- | ------- | ---------- | ----------------------------------------------------------------------- |
| next                                   | 16.3.8  | MIT        | Web framework (App Router, server rendering)                            |
| react, react-dom                       | 19.3.0  | MIT        | UI library                                                              |
| drizzle-orm                            | 0.45.x  | Apache-2.0 | Type-safe database queries                                              |
| pg                                     | 8.23.x  | MIT        | PostgreSQL driver                                                       |
| decimal.js                             | 10.6.x  | MIT        | Exact decimal maths for money and scores                                |
| zod                                    | 4.6.x   | MIT        | Validation of env vars, forms and imports                               |
| server-only                            | 0.0.1   | MIT        | Build error if server code is imported into the browser                 |
| lucide-react                           | 1.52.x  | ISC        | The app's only icon set, as inline SVG components (approved 06/10/2026) |
| @fontsource-variable/plus-jakarta-sans | 5.3.x   | OFL-1.1    | Plus Jakarta Sans, self-hosted through next/font/local                  |

### Development and testing

| Package                                                | Version | License    | Purpose                    |
| ------------------------------------------------------ | ------- | ---------- | -------------------------- |
| typescript                                             | 6.0.x   | Apache-2.0 | Type checking              |
| drizzle-kit                                            | 0.31.x  | MIT        | Database migrations        |
| tailwindcss, @tailwindcss/postcss                      | 4.3.x   | MIT        | Styling                    |
| eslint                                                 | 9.39.x  | MIT        | Linting                    |
| eslint-config-next                                     | 16.3.8  | MIT        | Next.js lint rules         |
| prettier                                               | 3.9.x   | MIT        | Code formatting            |
| vitest                                                 | 5.0.x   | MIT        | Unit and integration tests |
| @playwright/test                                       | 1.56.1  | Apache-2.0 | Browser (end-to-end) tests |
| @types/node, @types/react, @types/react-dom, @types/pg | —       | MIT        | Type definitions           |

## Claude Code skills (third-party instructions)

Vendored as-is into `.claude/skills/` for use by Claude Code during
development only. They are not part of the app and are never shipped to
schools. Each folder keeps its upstream LICENSE (and NOTICE where required).
Per CLAUDE.md, where a skill's advice conflicts with CLAUDE.md, CLAUDE.md wins.

| Skill         | Source (commit)                                             | Version | License    | Purpose                                                |
| ------------- | ----------------------------------------------------------- | ------- | ---------- | ------------------------------------------------------ |
| impeccable    | github.com/pbakaus/impeccable (`cf3d2fa`)                   | 4.5.0   | Apache-2.0 | Critique, audit and polish screens                     |
| ui-ux-pro-max | github.com/nextlevelbuilder/ui-ux-pro-max-skill (`477bcb2`) | —       | MIT        | Propose the design system once (docs/design-system.md) |

Notes:

- impeccable's launcher (`scripts/impeccable`) downloads a small engine binary
  from the project's GitHub releases on first run and verifies its SHA-256
  checksum before running it. The binary is cached in `~/.impeccable/`, not
  committed.
- impeccable can send an anonymous usage ping in some design flows. It is
  turned off for this project via `IMPECCABLE_NO_TELEMETRY` in
  `.claude/settings.json`.
- impeccable's `reference/ios.md` and `reference/android.md` derive from
  ehmo/platform-design-skills (MIT); see its NOTICE.md.
- ui-ux-pro-max runs locally (Python 3 standard library, local CSV data); no
  network access.

## Version pins (deliberately not on the newest release)

| Package          | Pinned | Newest | Reason                                                                                             | Lift when                             |
| ---------------- | ------ | ------ | -------------------------------------------------------------------------------------------------- | ------------------------------------- |
| typescript       | ~6.0   | 7.0    | typescript-eslint supports TypeScript < 6.1 only                                                   | typescript-eslint supports 7          |
| eslint           | 9      | 10     | eslint-plugin-react and eslint-plugin-import (used by eslint-config-next) do not support ESLint 10 | those plugins support 10              |
| @playwright/test | 1.56.1 | 1.63   | Matches the Chromium build pre-installed in our cloud dev environment                              | Any time; CI installs its own browser |

## Notable transitive licenses

Checked with `pnpm licenses list`. Nothing is GPL/AGPL/SSPL or "non-commercial".

| License                                        | Packages                                                        | Why it's acceptable                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| LGPL-3.0-or-later                              | @img/sharp-libvips-\* (pulled in by Next.js image optimisation) | Used unmodified as a separate shared library; LGPL permits commercial use.            |
| MPL-2.0                                        | lightningcss (Tailwind CSS build tool)                          | File-level copyleft only applies if we modify those files; we don't. Build-time only. |
| CC-BY-4.0                                      | caniuse-lite (browser support data)                             | Attribution licence for data; build-time only.                                        |
| Python-2.0, BlueOak-1.0.0, 0BSD, ISC, BSD, CC0 | various small packages                                          | Permissive.                                                                           |
