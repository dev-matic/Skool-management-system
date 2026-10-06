# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Bursars** record fee payments (mostly mobile money, plus cash and bank),
  reconcile them, print receipts and chase arrears. Daily, on a desktop or laptop.
- **Teachers** take attendance and enter class and exam scores for a whole class
  at a time, then produce report cards at the end of each term.
- **Admins** (head teacher or office staff) set up the school: academic years,
  terms, classes, subjects, teacher assignments, timetables and student records,
  often by bulk import from spreadsheets.
- **Parents and students** have no accounts in Phase 1. Guardian details (name,
  phone, relationship) are stored on the student record for contact and later
  SMS, kept separate from login accounts so accounts can be added later.

## Product Purpose

A low-cost school management system for Ghanaian schools. It replaces paper
registers, receipt books and spreadsheets for the everyday work of running a
school: student records, attendance, grades with printable report cards, and
fees with receipts and arrears reports. The first customer is one small school
(under ~500 students); it will then be sold to other schools.

Success means staff finish data entry faster than on paper or Excel, fee
balances and grades are always correct, and the school trusts the printouts.

## Positioning

- **Low cost:** affordable for small private and basic schools.
- **Mobile money built in:** payments are designed around recording and
  reconciling MTN MoMo, Telecel Cash and AirtelTigo Money, not bolted on.
- **Fast data entry:** spreadsheet-style grids for scores and attendance,
  keyboard-first forms, bulk actions.
- **Works on poor internet:** light pages, clear loading and error states, no
  lost work when the connection drops.

## Operating Context

- Ghana: currency GHS, phone numbers +233, dates dd/mm/yyyy.
- Three-term academic year. Levels KG, Primary, JHS and possibly SHS.
- Grading scale, class score vs exam score weighting, term and class structure
  are configured per school, never hardcoded.
- Printed A4 documents matter: report cards, receipts, class lists.
- Parents are reached mainly by SMS and WhatsApp (later phase).
- Internet in schools is slow or unreliable.

## Capabilities and Constraints

- Phase 1 (MVP): accounts and roles; school setup; timetable (class and teacher
  timetables with clash checks); student records with bulk CSV/Excel import;
  attendance; grades and printable report cards; fees and payments with
  receipts and arrears reports; role-based home dashboards (admin, bursar,
  teacher); focused analytics for fees, attendance and academics.
- Timetable: each school defines its own days, periods and breaks; supports
  subject teachers moving between classes (JHS/SHS) and one class teacher
  covering most subjects (KG/Primary). Tied to a term with history. Admins
  create and edit; teachers see their own and their classes' timetables
  read-only. Access is enforced on the server; clash messages appear only on
  the admin editing screen.
- Dashboards: each role's home screen shows what needs action today. Every
  number or chart leads to the students behind it, uses simple charts with
  exact figures, is scoped by school and role, and can be filtered by term,
  class and date range. Metric definitions live in docs/metrics.md with tests.
- Later phases, not built yet: parent and student accounts, SMS notifications,
  parent portal, announcements/calendar, library, inventory, HR, multi-school
  onboarding and billing, scanning/OCR of paper records, timetable
  substitutions and automatic generation, predictive or cross-school analytics.
- Multi-tenant from day one (every record belongs to a school). Phase 1 roles:
  admin, bursar and teacher only; parent and student accounts come in a later
  phase.
- Student data is children's personal data: Ghana Data Protection Act
  principles apply (least privilege, audit logs, encryption in transit,
  backups).
- Stack: Next.js, TypeScript, PostgreSQL, Tailwind CSS with the project's own
  components (no shadcn); Radix primitives only for complex accessible widgets.
- Product name: undecided (working name TBD).

## Brand Commitments

- The approved design system in `docs/design-system.md` is binding (see
  DESIGN.md). CLAUDE.md overrides any design skill advice.

## Evidence on Hand

- No real materials from the first school yet: no report card, receipt, fee
  schedule, logo or colours. Do not invent layouts and present them as the
  school's. All demo data is fake and marked as such.
- No testimonials, customers, pricing or benchmarks exist. Do not fabricate them.

## Product Principles

1. Correct money and grades come before everything else.
2. Speed of data entry is the main measure of a good screen.
3. A daily work tool, not a website: clarity and trust over decoration.
4. Every printout must be right the first time.
5. Configurable per school, so it can be sold to other schools.

## Accessibility & Inclusion

WCAG 2.2 AA, plus the per-user "Larger text" setting defined in the design
system. No other specific needs known yet.
