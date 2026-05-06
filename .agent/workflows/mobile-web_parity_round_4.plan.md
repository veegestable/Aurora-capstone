---
name: Mobile-Web Parity Round 4
overview: After merging latest mobile work from main, re-audit gaps and close the next layer of parity—counselor student depth (journal + charts), student mood history UX, admin resource/editor flows, richer school analytics, and production hardening (indexes, rules, tests).
todos:
  - id: round4-progress-log
    content: Maintain round-4-progress.md after each completed item
    status: pending
  - id: round4-mobile-diff-audit
    content: Diff mobile vs web since partner merge; list concrete file-level gaps
    status: pending
  - id: counselor-student-depth
    content: CounselorStudentWorkspace — journal calendar + last-7 charts when access matches mobile (reuse counselor-checkin-context + mood queries)
    status: pending
  - id: student-mood-history
    content: Student mood history route/UX parity vs mobile history (chart, filters, empty states)
    status: pending
  - id: admin-resource-detail
    content: Admin resource detail/edit flow parity vs mobile app/(admin)/resources/[id]
    status: pending
  - id: admin-analytics-charts
    content: School mood chart + threshold config UI wired to same Firestore paths as mobile (once mobile implements beyond scaffold)
    status: pending
  - id: infra-rules-indexes-tests
    content: Document/deploy Firestore indexes; rules for new collections; Vitest smoke tests for critical services
    status: pending
isProject: false
---

# Mobile → Web parity (Round 4)

## Why this round exists

Round 3 focused on counselor workspace shell, notes, session detail, resources, and admin analytics MVP. **Partner changes on mobile `main`** may have expanded screens, services, or Firestore usage. Round 4 starts with a **fresh diff audit**, then implements the highest-value remaining parity and **hardening** so features work safely in production.

## Context from workflows (unchanged)

- **[web-refactor.md](.agent/workflows/web-refactor.md):** Vite + React 19, `react-router-dom` v7, Tailwind v4 + tokens in [src/index.css](src/index.css), Context (not Zustand), `lucide-react`, Firebase. Services: `src/services/{feature}/{verb}/…` + barrel `index.ts`.
- **[aurora-design-system.md](.agent/workflows/aurora-design-system.md):** Dark AURORA tokens; web layout differences allowed.
- **[mobile-feature-parity.md](.agent/workflows/mobile-feature-parity.md):** Use as branding/feature checklist per surface.
- **Progress tracker:** **[round-4-progress.md](.agent/workflows/round-4-progress.md)** — update after each todo; do not replace Round 1–3 logs unless explicitly requested.

## Step 0 — Mobile diff audit (mandatory first task)

Before coding, produce a short table in `round-4-progress.md`:

| Mobile path / feature | Web equivalent | Gap |
|----------------------|----------------|-----|
| e.g. `mobile/app/(student)/history.tsx` | `src/pages/student/Journal/` vs dedicated history | … |

Suggested commands (run locally): compare `mobile/app/**` routes to `src/App.tsx` routes; grep for new `*.service.ts` under `mobile/src/services/` and check for missing `src/services/*` on web.

## Candidate parity themes (prioritize after audit)

### 1) Counselor student depth (high value)

**Mobile reference:** `mobile/src/pages/counselor/CounselorStudentDetailScreen.tsx`, `CounselorStudentJournalCalendar.tsx`, `CounselorStudentLast7Charts.tsx`, `mobile/src/services/counselor-checkin-context.service.ts`.

**Web goal:** In counselor student workspace (or equivalent route), when sharing + special-population rules match mobile, show **read-only journal calendar** and **last-7 analytics** using the same queries and consent gates. Reuse existing web `counselor-checkin-context` and `mood` services where possible.

### 2) Student mood history (medium–high)

**Mobile reference:** `mobile/app/(student)/history.tsx`, `mobile/src/pages/student/HistoryScreen.tsx`, `MoodHistoryChart.tsx`.

**Web goal:** Add or extend a **student-facing history** surface (route + nav) if journal alone does not cover the same UX; align chart aggregates with `mobile/src/utils/analytics/moodChartAggregates.ts` (or port helpers).

### 3) Admin resource detail / editor (medium)

**Mobile reference:** `mobile/app/(admin)/resources/[id].tsx`.

**Web goal:** Wire [AdminResourceDetail](src/pages/admin/ResourceDetail.tsx) to Firestore: load by id, edit metadata, save via `resourcesService.updateResource`, optional image URL field parity with mobile.

### 4) Admin school analytics + thresholds (medium, depends on mobile)

**Mobile reference:** `mobile/app/(admin)/(tabs)/analytics.tsx`, `SchoolMoodChart.tsx`, `ThresholdConfigCard.tsx`, `mobile/src/constants/thresholds.ts`.

**Web goal:** If mobile now persists thresholds or real chart data, mirror paths and UI. If still placeholder on mobile, keep web MVP tiles and document “blocked on mobile schema” in progress log.

### 5) Infrastructure & tests (high for merge quality)

- **Indexes:** `collectionGroup` queries, composite `where` + `orderBy` on new collections (`counselor_notes`, `session_notes`, `resources`, mood entries).
- **Security rules:** Least-privilege for counselor notes, session notes, resources, admin settings.
- **Tests:** Add Vitest (or project standard) + smoke tests for pure mappers and service boundaries; avoid full Firebase in unit tests (mock `firebase/firestore`).

## Explicit non-goals (unless scope expands)

- **Push notifications (FCM web)** — separate initiative.
- **Native-only gestures** — use web-equivalent patterns.

## Process checklist

Per feature: follow [web-refactor.md §5](.agent/workflows/web-refactor.md) and [mobile-feature-parity.md §0](.agent/workflows/mobile-feature-parity.md).

## Orphan & deprecation hygiene (every change)

After **every** meaningful code change in this round, actively check whether anything became **deprecated, duplicated, or orphaned**. Goal: shrink technical debt instead of leaving dead code behind.

- **Search call sites:** Grep for the old symbol, route, hook, or service name. If nothing imports it anymore, remove it (or consolidate into the new path).
- **Barrel exports:** Update `index.ts` files so removed modules are not still exported; fix any stale re-exports.
- **Types & mocks:** Delete unused types, mock arrays, and placeholder components that the new flow replaces.
- **Routes & nav:** Remove dead `Route` entries and sidebar/tab links that point at removed screens.
- **Docs & comments:** Update or delete comments that reference removed behavior; avoid “legacy” stubs unless still required for migration.
- **When unsure:** Prefer a single follow-up PR note in `round-4-progress.md` (“candidate removal: X — verify with team”) rather than deleting shared utilities without confirmation.

Record notable cleanups under **Cleanup / debt removed** in [round-4-progress.md](.agent/workflows/round-4-progress.md) when you complete a todo.

## Doc maintenance

Update **[round-4-progress.md](.agent/workflows/round-4-progress.md)** only for Round 4: status, files touched, blockers, and handoff notes.
