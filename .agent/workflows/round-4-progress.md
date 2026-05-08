# Mobile-Web Parity Round 4 — Progress Log

**Last updated:** 2026-05-06 — Batch 4: `counselor/students/:id` workspace  
**Plan file:** [mobile-web_parity_round_4.plan.md](.agent/workflows/mobile-web_parity_round_4.plan.md)  
**Scope:** Post–partner-merge mobile audit, counselor student depth (journal + charts), student mood history, admin resource detail, admin analytics/charts/thresholds, Firestore rules/indexes, automated smoke tests.

**Hygiene:** Each change should include a pass for **orphaned or deprecated** code (unused files, exports, routes, types, mocks). Remove or consolidate per [mobile-web_parity_round_4.plan.md § Orphan & deprecation hygiene](.agent/workflows/mobile-web_parity_round_4.plan.md).

---

## Cleanup / debt removed (append per merge or todo)

_Document files deleted, dead exports removed, routes dropped, etc._

| Date | What changed | Removed / consolidated |
|------|----------------|------------------------|
| 2026-05-06 | Remove redundant counselor modal (replaced by `/counselor/students/:id`) | `StudentProfileModal.tsx` (and moved `CheckInStats` type) |
| 2026-05-06 | Extracted counselor check-in stats type to shared types | Added `src/types/counselor.types.ts`; removed type dependency on `StudentProfileModal` |

---

## Status Overview

- [ ] `round4-mobile-diff-audit` — Diff mobile vs web; file-level gap table
- [x] `counselor-student-depth` — Workspace journal calendar + last-7 charts with mobile consent rules
- [x] `student-mood-history` — Student journal/history UX parity (no separate web route; aligned to `/student/journal`)
- [ ] `admin-resource-detail` — Admin resource detail/edit Firestore parity (in progress: service + detail edit form wired)
- [ ] `admin-analytics-charts` — School mood chart + threshold UI (when mobile schema exists)
- [ ] `infra-rules-indexes-tests` — Indexes, security rules notes, Vitest (or agreed runner) smoke tests
- [ ] `round4-progress-log` — Keep this file updated after each completed item

---

## Mobile vs Web Gap Table (fill during audit)

_Add rows as you compare `mobile/` routes and services to `src/`._

| Mobile | Web | Gap / notes |
|--------|-----|-------------|
| `app/(student)/history.tsx` (HistoryScreen used inside Journal tab) | `src/pages/student/Journal/index.tsx` | Web matches mobile: history is part of Journal; no separate `/student/history` surface. |
| Counselor student detail + journal | `StudentProfileModal` + `CounselorLast7MoodBars` | Last-7 bars in modal; full calendar: use `<JournalCalendar forUserId={...} />` on `counselor/students/:id` (Batch 4). |
| `JournalCalendar` (student-only before) | `JournalCalendar` + optional `forUserId` | **Batch 3 done** — enables counselor read-only month view when wired. |
| `app/(counselor)/students/[id]/index.tsx` | `src/pages/counselor/CounselorStudentDetail.tsx`, `/counselor/students/:id` | Full page: last-7 bars + `JournalCalendar forUserId`; summary via `location.state` from directory (refresh loses tiles until re-fetch — optional follow-up). |
| `app/(admin)/resources/[id].tsx` | `src/pages/admin/ResourceDetail.tsx` + `src/services/resources/*` | Detail view now loads/updates Firestore doc; verify final field schema against backend/mobile. |

---

## Work Log

### 2026-05-06

- Created Round 4 plan and this progress tracker.
- Added **Orphan & deprecation hygiene** rule to the plan; linked from this tracker and added **Cleanup / debt removed** table.

### 2026-05-06 (Batch 3)

- `JournalCalendar`: optional `forUserId` / `targetUserId`; copy for counselor vs student empty state.

### 2026-05-06 (Batch 4)

- `CounselorStudentDetail`, route `counselor/students/:id`, `Students.tsx` navigates with state; modal removed from directory (optional to restore).
- Removed redundant `/student/history` (mobile history is the Journal tab); web keeps a single canonical student journal surface.

### 2025-05-06 (Batch 5)

- Added `resourcesService` (`getResourceById`, `updateResource`), wired Admin Resources “Edit” to `/admin/resources/:id`, and replaced detail placeholder with editable form.
- Cleanup: typed `AdminResources` mock list with `ResourceRecord`, fixed type/icon condition, and documented that Add Resource remains unimplemented on both web and mobile.

---

## Implementation Notes (append per todo)

### `round4-mobile-diff-audit`

- **Status:** Not started
- **Files touched:** None
- **Notes:**

### `counselor-student-depth`

- **Status:** Done (initial parity — full page workspace)
- **Files touched:** `src/pages/counselor/CounselorStudentDetail.tsx`, `src/App.tsx`, `src/pages/counselor/Students.tsx`
- **Notes:** Optional: refetch student + stats on `:id` when `location.state` is empty (direct URL / refresh). Align consent gating with mobile when flags exist.

### `student-mood-history`

- **Status:** Done (initial parity)
- **Files touched:** `src/pages/student/History.tsx`, `src/App.tsx`, `src/layouts/StudentLayout.tsx`
- **Notes:** Same calendar/analytics as Journal; mobile mega-screen deferred.

### `admin-resource-detail`

- **Status:** In progress
- **Files touched:** `src/pages/admin/ResourceDetail.tsx`, `src/pages/admin/Resources.tsx`, `src/services/resources/{index.ts,types.ts,get/getResourceById.ts,put/updateResource.ts}`
- **Notes:** Uses `resources/{id}` collection path; confirm backend/mobile schema fields (`description`, `duration`, `type`, etc.) before marking complete.
- Mobile parity check: Add/create resource flow is not implemented on mobile yet (list/detail are placeholders; service only has `listPublished` stub).

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

- Add Resource parity is blocked by mobile/backend schema and create API not yet implemented.
