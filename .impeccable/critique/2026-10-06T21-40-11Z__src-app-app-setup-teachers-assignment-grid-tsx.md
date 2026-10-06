---
target: M2 school setup screens
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/user/Skool-management-system/src/app/(app)/setup/teachers/assignment-grid.tsx"
target_fingerprint: "sha256:4cb029177911fcae1a8037770f92c21f532f6058fb7eea9c66b24a6c6130b8cf"
target_path: /home/user/Skool-management-system/src/app/(app)/setup/teachers/assignment-grid.tsx
timestamp: 2026-10-06T21-40-11Z
slug: src-app-app-setup-teachers-assignment-grid-tsx
---
⚠️ DEGRADED: single-context (no sub-agents launched without the user's request)

Target: M2 School setup (years, classes, subjects, teachers, staff) and teacher dashboard.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Unsaved markers, unassigned count, current term |
| 2 | Match system / real world | 3 | KG/Basic/JHS naming, Ghanaian subjects, dd/mm/yyyy |
| 3 | User control and freedom | 3 | Cancel, confirmed deletes; no undo after grid save |
| 4 | Consistency and standards | 3 | One pattern for add rows, edit pages, confirmations |
| 5 | Error prevention | 3 | Leave warnings, server checks |
| 6 | Recognition rather than recall | 3 | Names not codes |
| 7 | Flexibility and efficiency | 2 | Teachers grid needs sideways scrolling past empty columns |
| 8 | Aesthetic and minimalist | 2 | Teachers grid mostly dashes; double-height rows |
| 9 | Error recovery | 3 | Specific messages |
| 10 | Help and documentation | 2 | Short hints only |
| Total | | 27/40 | Good |

Detector: CLI 0; browser: em-dash placeholders (993 on Teachers, false positive as prose but confirms sparse grid), cramped select padding 7.5px (real), disabled-button contrast (WCAG-exempt).

Priority issues:
- [P1] Teachers grid mixes all stages in alphabetical columns -> one grid per stage -> /impeccable layout
- [P2] Double-height rows from "Class teacher takes all" -> compact labelled icon button + stage-level action -> /impeccable layout
- [P2] Cramped grid dropdown padding -> 8px -> /impeccable polish
Minor: year switcher needs "Show"; subjects grid alphabetical (acceptable); phone setup sub-menu scrolls.
