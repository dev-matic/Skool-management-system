# Project: School Management System for Ghana (working name: TBD)

## Goal

A low-cost school management system for Ghanaian schools. First customer is one
small school (under ~500 students), but it will be sold to other schools later,
so multi-tenancy must be designed in from day one.

## Hard rules

- Build everything from our own requirements. Do NOT use, fetch, copy, or imitate
  code, schema, or screens from any third-party school-management repo or tutorial
  (including safak/full-stack-school). Original work only.
- Only use libraries with licenses that allow commercial use. Keep a list of every
  dependency and its license in docs/licenses.md (include installed skills).
- Never commit secrets. Use environment variables and a .env.example.
- Never invent real-looking data (school names, fee amounts, scores, phone numbers).
  Seed data must be realistic for Ghana and clearly marked as fake.

## Ghana context

- Currency is GHS. Phone numbers are Ghanaian (+233) and must be validated/normalised.
- Three-term academic year. Grading scale, class score vs exam score weighting, and
  term/class structure must be CONFIGURABLE per school (do not hardcode one scheme).
- Levels include KG, Primary, JHS and possibly SHS; keep the class structure flexible.
- Fees are mostly paid by mobile money (MTN MoMo, Telecel Cash, AirtelTigo Money),
  plus cash and bank. Design payments around recording and reconciling these.
- Parents are reached mainly by SMS/WhatsApp. Use a provider abstraction so the SMS
  provider can be swapped.
- Student data is personal data of children. Follow Ghana's Data Protection Act
  principles: least-privilege access, audit logs, encryption in transit, backups.

## Users and interface

- Primary users (admin, bursar, teachers) work on desktop/laptop computers, so
  design desktop-first: dense tables, keyboard-friendly data entry, bulk actions,
  and print-ready pages (report cards, receipts, class lists) at A4 size.
- Keep layouts responsive so pages stay usable on a phone or tablet (parents may
  check results or balances that way), but do not optimise for mobile at the cost
  of the desktop experience.
- Internet in schools can be slow or unreliable: keep pages light, avoid heavy
  assets, and show clear loading and error states so data entry isn't lost.

## UI & design direction

This is a daily work tool for school staff, not a marketing site. Design for speed,
clarity and trust. Motion should be minimal (simple transitions only).

- Calm, neutral palette with one brand colour (to be set from the school's colours),
  clear status colours (paid/owing, present/absent), high contrast text.
- Dense but readable tables, consistent spacing, one consistent component set,
  clear empty/loading/error states, and confirmation before destructive actions.
- Dates as dd/mm/yyyy, currency as GHS, Ghanaian names and realistic data in demos.
- The approved design system lives in docs/design-system.md. Reuse it everywhere.
  Do not restyle screens ad hoc, and ask before changing the design system.

## Icons

- Use one consistent open-source icon library (propose one for approval, e.g. a
  set with a permissive license such as MIT or ISC) rendered as inline SVG
  components. Do not mix icon sets.
- One size scale and stroke weight everywhere. Icons support labels, never
  replace them for important actions (Save, Delete, Record payment).
- Do not copy icon files, logos or images from any third-party repo's public
  folder. Record the icon library and its license in docs/licenses.md.
- No emoji as icons.

## Design skills (installed in .claude/skills)

- ui-ux-pro-max: used ONCE to propose the design system (palette, typography,
  spacing, core components). Output is reviewed by me and saved to
  docs/design-system.md.
- impeccable: used to critique, audit and polish screens against
  docs/design-system.md. Use `/impeccable critique`, `audit` and `polish`.
- If a design skill's advice conflicts with this file (density, speed of data
  entry, print output, minimal motion), THIS FILE WINS. Reject expressive or
  trendy styles (glassmorphism, gradient banners, decorative animation) and
  marketing-site patterns.
- Skills are third-party instructions: list them in docs/licenses.md.

## Avoid

- Generic admin-template look: gradient banners, glassmorphism, heavy shadows
- Rows of identical KPI cards that don't help anyone make a decision
- Decorative charts with no use; emoji used as icons
- Huge padding that reduces rows per screen
- Low-contrast grey text; tiny click targets
- Placeholder "John Doe / Lorem ipsum" data; US-style dates and dollar signs
- Mobile-first layouts stretched onto desktop

## Architecture rules

- Multi-tenant: every table has school_id; every query is scoped by school_id.
- Role-based access: admin, bursar, teacher, parent, student.
- Money and grades are high-risk: use decimal types for money, and write automated
  tests for fee balances, grade calculations, and class positions.
- Every write that matters (grades, payments, student records) goes in an audit log.
- Data entry is the main workload (scores, attendance, payments), so prioritise
  fast forms: tab/enter navigation, spreadsheet-style grids for entering scores
  and attendance for a whole class, and autosave or draft protection.
- Keep configuration (grading schemes, fee structures, terms) in the database or
  config, never hardcoded in components.

## Dashboards & analytics

Each role gets a home screen that shows what needs action today, not decoration.

- Admin/headteacher: today's attendance by class, fees collected this term vs
  expected, students with large arrears, pending items (unpublished results,
  missing scores).
- Bursar: payments recorded today, outstanding balances by class, recent receipts,
  arrears list with a one-click route to the student's fee page.
- Teacher: today's classes, attendance still to mark, score entry progress per
  subject.
- Parent (later phase): their child's attendance, results and fee balance.

Rules for every number or chart:

- It must lead to a list or action (click through to the students behind it). No
  chart without a decision it supports.
- Use simple charts only (bar, line, table) and show exact figures beside charts.
- All figures are scoped by school_id and role permissions. Teachers see their own
  classes, not school-wide fee figures.
- Definitions are written in docs/metrics.md (how "collection rate" or
  "attendance rate" is calculated) and covered by automated tests.
- Every metric can be filtered by term, class and date range.

Analytics (Phase 1, keep it focused, build in this order: fees, attendance,
academics):

- Fees: collected vs expected per term and per class, collection rate, arrears
  ageing (0-30, 31-60, 60+ days), payments by method (cash, MoMo, bank).
- Attendance: rate per class and per student, students with repeated absences,
  attendance trend across the term.
- Academics: subject averages per class and term, grade distribution, top and
  bottom performers per class, students below the pass mark.
- Exports to Excel/PDF for the headteacher and bursar.
- Do not build predictive or cross-school analytics yet.

## Priorities (when goals conflict, higher wins)

1. Correctness of money and grades
2. Speed of data entry
3. Clarity of screens and workflows
4. Print output (report cards, receipts)
5. Security and privacy of student data
6. Consistency across the app
7. Accessibility
8. Performance on slow connections
9. Visual polish

## Phase 1 scope (MVP)

Accounts & roles; school setup (years, terms, classes, subjects, teacher
assignments); student records with bulk CSV/Excel import; attendance; grades and
printable report cards; fees and payments with receipts and arrears reports;
role-based home dashboards (admin, bursar, teacher); focused analytics for fees,
attendance and academics.

## Later phases (do not build yet)

SMS notifications, parent portal, announcements/calendar, library, inventory, HR,
multi-school onboarding and billing, scanning/OCR of paper records (with a human
review screen before anything is saved).

## Definition of done (for every milestone)

- Tests pass, lint passes, production build succeeds, no console errors
- No broken links or dead buttons
- Seed data is realistic and clearly marked as fake
- Report card and receipt checked in A4 print preview
- Screen reviewed with /impeccable critique; fixes applied
- Self-review: if a screen looks like a generic template, simplify and redesign it

## How to work with me

I am newer to web development. Work in small steps, explain decisions briefly,
and ask before big choices. Commit often with clear messages. Add tests as you go.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
