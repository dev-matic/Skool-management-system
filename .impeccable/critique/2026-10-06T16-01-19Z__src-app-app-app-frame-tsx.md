---
target: "UI foundation: app frame, dashboard, login, components"
total_score: 27
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
target_identity: "file:/home/user/Skool-management-system/src/app/(app)/app-frame.tsx"
target_fingerprint: "sha256:234fcafb6eb5220edaf568c46509a8dc13fd2678c53a2de9b16d5a0b9f028de2"
target_path: /home/user/Skool-management-system/src/app/(app)/app-frame.tsx
timestamp: 2026-10-06T16-01-19Z
slug: src-app-app-app-frame-tsx
---

⚠️ DEGRADED: single-context (no sub-agents launched without the user's request)

Target: app frame, dashboard, login, /dev/components (UI foundation, commit ef2e2e0)

| #     | Heuristic                      | Score | Key issue                                            |
| ----- | ------------------------------ | ----- | ---------------------------------------------------- |
| 1     | Visibility of system status    | 3     | Active nav clear; no current term in top bar yet     |
| 2     | Match system / real world      | 3     | Plain school language; generic product name          |
| 3     | User control and freedom       | 3     | Sign out, switch school, menu close reachable        |
| 4     | Consistency and standards      | 3     | Tokens only; school picker uses its own button style |
| 5     | Error prevention               | 2     | Login has no client-side checks                      |
| 6     | Recognition rather than recall | 3     | Icons always with labels                             |
| 7     | Flexibility and efficiency     | 2     | No skip link, no shortcuts                           |
| 8     | Aesthetic and minimalist       | 3     | Calm; "Soon" badges loudest element in sidebar       |
| 9     | Error recovery                 | 3     | Login error clear and announced                      |
| 10    | Help and documentation         | 2     | Only "ask your administrator"                        |
| Total |                                | 27/40 | Good                                                 |

Design specificity: calm and correct but category-interchangeable until Ghana-specific workflow content (term, GHS, MoMo) lands.
Detector: CLI 0 findings; browser 0 on login/dashboard, 2 low-contrast on /dev/components (disabled button = WCAG-exempt false positive; loading button = real).

Priority issues:

- [P1] No skip-to-content link -> /impeccable harden
- [P2] Loading button looks disabled -> /impeccable polish
- [P2] "Soon" badges crowd sidebar; labels wrap at 224px -> /impeccable distill
- [P2] Current term missing from top bar (needs M2 data) -> /impeccable layout

Personas: keyboard teacher (9 tabs to content), screen-reader user (busy announced as unavailable), bursar on phone (name/role hidden).
Minor: school picker hover not from shared component; name/role hidden on phone; empty-state icon correctly aria-hidden.
