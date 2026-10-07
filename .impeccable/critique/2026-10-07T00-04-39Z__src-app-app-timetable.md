---
target: timetable screens
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/Skool-management-system/src/app/(app)/timetable"
timestamp: 2026-10-07T00-04-39Z
slug: src-app-app-timetable
---
⚠️ DEGRADED: single-context (sub-agents not used: the user asked for no sub-agents unless requested)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Unsaved chip, outlined changed cells, lesson count; but clash errors are not tied to the cells involved |
| 2 | Match System / Real World | 3 | Periods, breaks, KG day vs main day, dd/mm/yyyy and terms match how schools work |
| 3 | User Control and Freedom | 3 | Cancel, leave-page guard, nothing saved on clash; no undo after a save |
| 4 | Consistency and Standards | 3 | Same cards, pills and tables as setup; the teacher grid drops breaks the class grid shows |
| 5 | Error Prevention | 2 | Clashes surface only on save; the subject menu gives no hint the teacher is busy in that slot |
| 6 | Recognition Rather Than Recall | 3 | Teacher shown under each subject; room choice visible |
| 7 | Flexibility and Efficiency | 2 | Two selects per filled cell doubles Tab stops (about 70 per class week); no fill/copy shortcuts |
| 8 | Aesthetic and Minimalist Design | 3 | Read-only grids are calm and clear; the editor is dense with repeated room menus |
| 9 | Error Recovery | 3 | Clashes are named and values kept; the list sits above a long grid |
| 10 | Help and Documentation | 2 | One-line hints only; no explanation of how day plans relate to stages beyond labels |
| **Total** | | **27/40** | **Good, with clear fixes** |

## Design Specificity Verdict

LLM assessment: authored for this product. The day-plan-per-stage model (KG day vs main day), teacher filled from assignments, named clash sentences, today's column and the A4 landscape print header are specific to a Ghanaian basic school running a printed weekly timetable. The read-only grids (My timetable, teacher dashboard list) are the strongest screens. The class editor is the weakest: it reads as a wall of form controls rather than a timetable.

Deterministic scan: `impeccable detect` over src/app/(app)/timetable and dashboard returned no findings (exit 0). Browser overlay injection was not run; screenshots and an A4 PDF were inspected instead.

## Overall Impression

The viewing side is right: a teacher sees their week at a glance and prints it cleanly. The editing side works and is safe (all-or-nothing, named clashes) but is slower and noisier than it needs to be. Biggest opportunity: make the class editor feel like a timetable with selects, not selects arranged in a table, and show clashes on the cells before or at save.

## What's Working

- Clash messages name teacher, class, subject, day and time, and nothing is saved: correct for trust.
- Teacher "Today's classes" and My timetable: tinted lesson cards with subject first, class second, today's column marked.
- A4 landscape print: header with school, title and date; clean borders.

## Priority Issues

- [P1] Editor cells carry a room select on every filled lesson
  - Why: doubles Tab stops and visual noise; most lessons need no room.
  - Fix: show the room menu only when a room is set or after a small "Room" toggle in the cell; keep it out of the Tab path otherwise.
  - Command: /impeccable distill
- [P1] Clashes are not shown on the cells
  - Why: on a 35-cell grid the list at the top forces the admin to hunt for the slot.
  - Fix: return the clashing cell keys, outline those cells in danger colour with the message under the select, move focus to the alert.
  - Command: /impeccable harden
- [P2] Teacher grid and teacher print omit breaks
  - Why: Period 3 runs into Period 4 with no visible break; the class grid shows breaks, so the two views disagree.
  - Fix: add break bands from the day plan when all lessons come from one plan.
  - Command: /impeccable polish
- [P2] Today's column tint prints
  - Why: print should be black on white (design system, Print).
  - Fix: drop the today tint in print.
  - Command: /impeccable polish

## Persona Red Flags

- Admin entering a whole school (power user): about 70 Tab stops per class week; no way to copy Monday to other days or fill a subject down a row.
- Teacher on a phone (first-timer): My timetable scrolls sideways inside its box at 390px; usable but needs a day-by-day list on small screens later.

## Minor Observations

- "Followed by" label on the day plan form could read "Used by".
- Class list could show filled vs free lesson slots.
- "Period" header in the printed grid is grey text.

## Questions to Consider

- Should the editor default to choosing a teacher's free slots, greying out subjects whose teacher is busy?
- Would a "copy this day to…" action replace most typing?
