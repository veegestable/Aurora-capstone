# Mobile-Web Parity Round 4 — Progress Log

**Last updated:** 2026-05-06 (hygiene rule added)  
**Plan file:** [mobile-web_parity_round_4.plan.md](.agent/workflows/mobile-web_parity_round_4.plan.md)  
**Scope:** Post–partner-merge mobile audit, counselor student depth (journal + charts), student mood history, admin resource detail, admin analytics/charts/thresholds, Firestore rules/indexes, automated smoke tests.

**Hygiene:** Each change should include a pass for **orphaned or deprecated** code (unused files, exports, routes, types, mocks). Remove or consolidate per [mobile-web_parity_round_4.plan.md § Orphan & deprecation hygiene](.agent/workflows/mobile-web_parity_round_4.plan.md).

---

## Cleanup / debt removed (append per merge or todo)

_Document files deleted, dead exports removed, routes dropped, etc._

| Date | What changed | Removed / consolidated |
|------|----------------|------------------------|
| | | |

---

## Status Overview

- [ ] `round4-mobile-diff-audit` — Diff mobile vs web; file-level gap table
- [ ] `counselor-student-depth` — Workspace journal calendar + last-7 charts with mobile consent rules
- [x] `student-mood-history` — Student history route/UX vs mobile `history`
- [ ] `admin-resource-detail` — Admin resource detail/edit Firestore parity
- [ ] `admin-analytics-charts` — School mood chart + threshold UI (when mobile schema exists)
- [ ] `infra-rules-indexes-tests` — Indexes, security rules notes, Vitest (or agreed runner) smoke tests
- [ ] `round4-progress-log` — Keep this file updated after each completed item

---

## Mobile vs Web Gap Table (fill during audit)

_Add rows as you compare `mobile/` routes and services to `src/`._

| Mobile | Web | Gap / notes |
|--------|-----|-------------|
| `app/(student)/history.tsx` | `src/pages/student/History.tsx`, `/student/history` | Route + nav; reuses journal UI (mobile `HistoryScreen` is larger — optional later). |
| Counselor student detail + journal | `StudentProfileModal` + `CounselorLast7MoodBars` | Last-7 bars in modal; full calendar: use `<JournalCalendar forUserId={...} />` on `counselor/students/:id` (Batch 4). |
| `JournalCalendar` (student-only before) | `JournalCalendar` + optional `forUserId` | **Batch 3 done** — enables counselor read-only month view when wired. |

---

## Work Log

### 2026-05-06

- Created Round 4 plan and this progress tracker.
- Added **Orphan & deprecation hygiene** rule to the plan; linked from this tracker and added **Cleanup / debt removed** table.

### 2026-05-06 (Batch 3)

- `JournalCalendar`: optional `forUserId` / `targetUserId`; copy for counselor vs student empty state.

---

## Implementation Notes (append per todo)

### `round4-mobile-diff-audit`

- **Status:** Not started
- **Files touched:** None
- **Notes:**

### `counselor-student-depth`

- **Status:** In progress (modal: last-7 bars; calendar: use `forUserId` on next route/page)
- **Files touched:** `src/components/journal/JournalCalendar.tsx` (Batch 3); earlier: `CounselorLast7MoodBars.tsx`, `StudentProfileModal.tsx`
- **Notes:** Add `counselor/students/:id` and render `<JournalCalendar forUserId={id} />` when rules allow.

### `student-mood-history`

- **Status:** Done (initial parity)
- **Files touched:** `src/pages/student/History.tsx`, `src/App.tsx`, `src/layouts/StudentLayout.tsx`
- **Notes:** Same calendar/analytics as Journal; mobile mega-screen deferred.

### `admin-resource-detail`

- **Status:** Not started
- **Files touched:** None
- **Notes:**

### `admin-analytics-charts`

- **Status:** Not started
- **Files touched:** None
- **Notes:**

### `infra-rules-indexes-tests`

- **Status:** Not started
- **Files touched:** None
- **Notes:**

---

## Open Questions / Blockers

- None yet.
