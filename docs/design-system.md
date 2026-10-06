# Design system

Approved 06/10/2026. This is the single source of truth for how every screen
looks and behaves. Reuse it everywhere; do not restyle screens ad hoc. Ask
before changing anything in this file (see CLAUDE.md).

Proposed with the ui-ux-pro-max skill, filtered against CLAUDE.md. Where the
two disagree, CLAUDE.md wins.

## Implementation

- Styling with **Tailwind CSS**; the tokens below become Tailwind theme values.
- Components are the project's own, built from this document. **No shadcn.**
- **Radix UI primitives** (MIT) only where accessibility is hard to get right:
  dialogs, dropdown menus, popovers and searchable pickers. Added one at a time
  when a screen needs it, restyled with these tokens.

## Principles

1. **A work tool, not a website.** Bursars, teachers and admins use it all day
   on laptops. Speed, clarity and trust come before decoration.
2. **Dense but readable.** Fit a whole class or a page of payments on screen
   without shrinking text below the floors in this document.
3. **Never colour alone.** Every status has an icon and a word as well as a colour.
4. **Keyboard first.** Every action works without a mouse, with a visible focus ring.
5. **Prints cleanly.** Report cards, receipts and class lists are A4, black on white.
6. **Light on slow internet.** One font file, inline SVG icons, no images for UI.

## Colour

All colours are tokens. Components use token names, never raw hex values.
Light theme only. Contrast ratios are WCAG 2.2, checked for every text pair.

### Neutrals

| Token              | Hex       | Use                                             | Contrast        |
| ------------------ | --------- | ----------------------------------------------- | --------------- |
| `--bg-page`        | `#F8FAFC` | App background                                  |                 |
| `--bg-surface`     | `#FFFFFF` | Tables, forms, panels, dialogs                  |                 |
| `--bg-subtle`      | `#F1F5F9` | Table header, disabled fields, neutral chips    |                 |
| `--bg-row-hover`   | `#F8FAFC` | Table row hover                                 |                 |
| `--border-divider` | `#E2E8F0` | Lines between rows and panels (decorative only) |                 |
| `--border-input`   | `#64748B` | Input, select and checkbox borders              | 4.8:1 on white  |
| `--text`           | `#0F172A` | All body text, table cells, button text         | 17.9:1 on white |
| `--text-secondary` | `#475569` | Hints, metadata, column headers                 | 7.6:1 on white  |
| `--text-disabled`  | `#64748B` | Disabled controls only (exempt from contrast)   |                 |

No text is ever lighter than `--text-secondary`.

### Brand: light blue

| Token            | Hex       | Use                                              | Contrast                 |
| ---------------- | --------- | ------------------------------------------------ | ------------------------ |
| `--brand`        | `#7DD3FC` | Primary button fill, top bar, active nav item    | `--text` on it 10.7:1    |
| `--brand-hover`  | `#38BDF8` | Primary button hover and pressed                 | `--text` on it 8.3:1     |
| `--brand-edge`   | `#0284C7` | 1px border on primary buttons                    | 4.1:1 on white (≥ 3:1)   |
| `--brand-tint`   | `#E0F2FE` | Selected table row, highlighted grid cell        | `--text` on it 15.6:1    |
| `--brand-strong` | `#0369A1` | Links (always underlined), selected-row left bar | 5.9:1 on white           |
| `--focus`        | `#1D4ED8` | Focus ring, 2px solid with 2px offset            | 6.7:1 white, 4.0:1 brand |

- Text on light blue is always `--text` (dark). White text is never used on
  `--brand` or `--brand-hover`.
- **Per-school colour.** A school may replace `--brand` with its own colour only
  if `--text` on it scores at least 4.5:1 and the colour is not a status hue
  (green, amber or red). Otherwise the school colour appears only as a 4px stripe
  on the top bar and as the rule under printed headers, and light blue stays.

### Status

Dark text on a light tint. Always shown with an icon and a word.

| Status  | Text      | Background | Contrast | Meaning                                |
| ------- | --------- | ---------- | -------- | -------------------------------------- |
| Success | `#166534` | `#DCFCE7`  | 6.5:1    | Paid, Present, Published, Reconciled   |
| Warning | `#92400E` | `#FEF3C7`  | 6.4:1    | Part-paid, Late, Unsaved changes       |
| Danger  | `#991B1B` | `#FEE2E2`  | 6.8:1    | Owing / arrears, Absent, Error         |
| Info    | `#075985` | `#E0F2FE`  | 6.6:1    | Pending reconciliation, Overpaid, Note |
| Neutral | `#334155` | `#F1F5F9`  | 9.5:1    | Draft, Excused, Withdrawn, Recorded    |

Destructive buttons: white text on `#B91C1C` (6.5:1), used only inside a
confirmation dialog.

## Typography

**Font: Plus Jakarta Sans** (variable weight, SIL Open Font License 1.1).
Self-hosted with `next/font`; no request to Google at runtime. Fallback:
`system-ui, "Segoe UI", Roboto, Arial, sans-serif`.

Checked in the official font file: it has tabular figures (`tnum`).

| Role            | Size / line height | Weight | Use                                 |
| --------------- | ------------------ | ------ | ----------------------------------- |
| Page title      | 20 / 28            | 600    | One per page                        |
| Section heading | 16 / 24            | 600    | Panels, form sections               |
| Base            | 14 / 20            | 400    | Body, table cells, inputs, buttons  |
| Label           | 13 / 18            | 600    | Field labels, table headers         |
| Caption         | 12 / 16            | 600    | Status chips, badges (minimum size) |
| Reading         | 16 / 24            | 400    | Report-card comments, long notes    |
| Print body      | 11pt               | 400    | A4 documents                        |

- Sizes are in `rem` so the **"Larger text"** user preference can scale the whole
  interface from 14px to 16px base. Saved per user.
- Sentence case everywhere. No all-caps headers.
- **Numbers:** every money, score, count and position column uses
  `font-variant-numeric: tabular-nums` and is right-aligned.

### Formats

| Data     | Format                                                               | Example          |
| -------- | -------------------------------------------------------------------- | ---------------- |
| Date     | dd/mm/yyyy                                                           | 06/10/2026       |
| Time     | 24-hour                                                              | 14:32            |
| Money    | 2 decimals, comma groups                                             | 1,250.00         |
| Currency | `GHS` in the column header; in cells only when standing alone        | GHS 1,250.00     |
| Phone    | Stored as +233…; shown grouped                                       | +233 24 123 4567 |
| Score    | As configured per school; never rounded for display without the rule | 78.5             |

## Spacing, size and shape

- **Spacing scale (4px base):** 4, 8, 12, 16, 24, 32. Nothing larger inside the app.
- **Controls:** inputs and buttons 32px tall; compact buttons in tables 28px.
  Minimum pointer target 24×24px. On touch screens (`pointer: coarse`) controls
  grow to 40px.
- **Table rows:** 36px default, 32px compact. Cell padding 8px vertical, 12px
  horizontal.
- **Radius:** 4px on controls and chips, 6px on panels and dialogs.
- **Depth:** panels use a 1px `--border-divider`, no shadow. Only menus, popovers
  and dialogs have one shadow: `0 4px 12px rgb(15 23 42 / 0.12)`.
- **Motion:** colour and opacity only, 120–150ms ease-out. Nothing moves or slides.
  With `prefers-reduced-motion: reduce`, no transitions at all.

## Layout

- **Top bar** (48px, `--brand` background, `--text`): school name, current
  term, search, user menu. A school colour stripe sits on top when set.
- **Sidebar** (224px, collapsible to icons with tooltips): main sections. Active
  item has `--brand-tint` background and a 3px `--brand-strong` left bar.
- **Content**: full width up to 1440px, 24px page padding. Page title row holds
  the title, then actions on the right (one primary at most).
- Below 1024px the sidebar becomes a drawer. Below 640px tables scroll
  sideways with the first column fixed; forms become one column.

## Icons

**Lucide** (`lucide-react`, ISC license), rendered as inline SVG components. No
other icon set, no copied icon files, no emoji.

- Sizes: 16px in tables, buttons and chips; 20px in navigation. Stroke 1.75
  everywhere.
- Icons sit beside a text label. Icon-only buttons are allowed only for
  repeated, well-known row actions (edit, more), and must have an
  `aria-label` and a tooltip. Save, Delete, Record payment and other important
  actions always show their label.
- Decorative icons get `aria-hidden="true"`.

## Components

### Button

| Variant   | Look                                                     | Use                                  |
| --------- | -------------------------------------------------------- | ------------------------------------ |
| Primary   | `--brand` fill, `--brand-edge` 1px border, `--text`, 600 | The one main action per screen       |
| Secondary | `--bg-surface`, `--border-input` 1px border, `--text`    | All other actions                    |
| Ghost     | No fill or border, `--brand-strong` text                 | Low-priority actions, inline actions |
| Danger    | `#B91C1C` fill, white text                               | Only inside a confirmation dialog    |

- Labels start with a verb: "Record payment", "Publish results", "Print receipt".
- Hover: primary uses `--brand-hover`; secondary and ghost use `--bg-subtle`.
- Loading: spinner replaces the icon, button disabled, width unchanged, label
  stays ("Saving…").
- Disabled: `--bg-subtle` fill, `--text-disabled`, no hover. Explain why nearby
  if it isn't obvious.
- Keyboard: Enter submits the form's primary action; Escape closes dialogs.

### Table

- Header row sticky, `--bg-subtle` background, 13px 600 `--text-secondary`.
  Sortable headers are buttons with `aria-sort` and a sort icon.
- Rows separated by `--border-divider`. No zebra stripes. Hover `--bg-row-hover`.
- Selected row: `--brand-tint` background and a 2px `--brand-strong` left bar.
- Numbers right-aligned with tabular figures. Text left-aligned. Dates centred
  in their column only if every value is a date.
- **Totals row:** 600 weight with a 2px top border in `--border-input`.
- **Bulk actions:** first column is a checkbox. When rows are ticked, the toolbar
  becomes a bulk bar: "3 selected · Print receipts · Export · Clear".
- **Pagination:** 50 rows per page, with page size options 25 / 50 / 100.
- **States:**
  - Loading: placeholder rows at full row height (no layout jump), `aria-busy`.
  - Empty: one sentence and the next action, e.g. "No payments recorded this
    term." + "Record payment".
  - Error: what failed in plain words, and a "Try again" button. Existing data
    stays on screen.

### Score and attendance grid

The table, with editable cells, for entering a whole class at once.

- Enter moves down, Tab moves right, Shift reverses. Arrow keys move between
  cells when not editing.
- Each cell validates against the school's configured rules (e.g. class score
  0–30). An invalid cell gets a `#991B1B` border, an icon and a message under
  the grid row; the value is kept, not cleared.
- Totals, grades and positions are calculated by the server and shown read-only.
- Autosave drafts continuously. Status is always visible above the grid:
  "Saved 14:32", "Saving…", or "Unsaved changes" (warning chip). Leaving with
  unsaved changes asks for confirmation.
- Attendance cells cycle with single keys: P present, A absent, L late, E excused.

### Form

- Labels above fields, 13px 600. Optional fields say "(optional)"; required is
  the default.
- On desktop, related short fields sit two or three to a row.
- Hints under the field in `--text-secondary`.
- **Validation:** on leaving a field, and on submit. Errors appear under the
  field with an icon and a specific message, linked by `aria-describedby`
  ("Enter a Ghana number, e.g. 024 123 4567"). After a failed submit, an error
  summary at the top takes focus and links to each field.
- **Field types:**
  - Money: fixed `GHS` prefix, right-aligned, 2 decimals, tabular figures.
  - Phone: accepts 024…, 24… or +233…, stores +233….
  - Date: dd/mm/yyyy text input with a calendar button; hint shows the format.
  - Select: native `<select>` for short lists; searchable combobox for long ones
    (students, classes).
- Ctrl+S saves. Unsaved changes are protected when leaving the page.

### Badge

Neutral facts and counts: "JHS 2", "Boarding", "3 unreconciled".
`--bg-subtle` background, `--text`, 12px 600, 4px radius, 20px tall. Never
carries status meaning.

### Status chip

Icon + word, in the status colours above. 22px tall, 12px 600, 4px radius,
6px horizontal padding, 16px icon.

| Area       | Chips                                          |
| ---------- | ---------------------------------------------- |
| Fees       | Paid · Part-paid · Owing · Overpaid            |
| Attendance | Present · Absent · Late · Excused              |
| Records    | Draft · Published · Withdrawn                  |
| Payments   | Recorded · Pending reconciliation · Reconciled |

### Dialog and confirmation

- Used for confirmations and short tasks only; long tasks get their own page.
- Destructive confirmation names the thing and the consequence: "Delete payment
  GHS 450.00 for Ama Mensah? This can't be undone." Buttons: "Cancel"
  (secondary, focused by default) and "Delete payment" (danger).
- Focus is trapped inside and returns to the trigger on close. Escape cancels.

### Feedback messages

- Success: a short toast at the bottom right for 4 seconds, with an "Undo" where
  possible ("Payment recorded. Print receipt").
- Errors never disappear on their own; they stay next to what failed.

## Print (A4)

- Black text on white, 11pt, 15mm margins. No backgrounds, shadows or
  navigation.
- Tables print with borders and repeat their header row on every page.
- Status chips print as plain text in a thin outline.
- Header: school name, crest if provided, document title, date printed. The
  brand colour appears only as a thin rule under the header.
- Checked in the browser's print preview before any milestone is done.

## Accessibility checklist

- Text contrast at least 4.5:1; control borders and focus at least 3:1.
- Visible focus ring on every control; tab order follows visual order.
- No information by colour alone.
- Every input has a visible label; icon-only buttons have `aria-label`.
- Targets at least 24×24px; 40px on touch screens.
- Works with "Larger text" on and at 200% browser zoom.

## Rejected (do not use)

From the skill's suggestions, rejected because they conflict with CLAUDE.md:

- Dark "tech" theme and monospace headings (Fira Code).
- Children's education style: Baloo 2 / Comic Neue fonts, bright indigo and
  orange, claymorphism.
- Landing-page patterns: hero sections, feature grids, repeated calls to action.
- Scroll-reveal animation and any animation library.
- Rows of identical KPI summary cards and decorative charts.
- Glassmorphism, gradient banners, heavy shadows, emoji icons.
