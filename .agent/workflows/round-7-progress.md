---
description: Round 7 web parity — Journal analytics charts. Update after each batch.
---

# Round 7 Parity — Progress Tracker

Source plan: [round7_parity.md](../round7_parity.md)

Standards: [aurora-design-system.md](aurora-design-system.md), [web-refactor.md](web-refactor.md), [mobile-feature-parity.md](mobile-feature-parity.md)

**Implementation style:** Ask Mode or Snippet Mode — copy-paste-ready snippets, small batches; **strict variable usage** (declare only what you use); **modular** chart components; **cleanup** orphaned code whenever this area is touched.

> **Update rule:** After every batch, mark its checkbox, fill the **Touched** files,
> and add a one-line **Notes** entry. Cleanup items go under the bottom section
> as we discover them.

---

## Status legend

- [ ] Pending
- [/] In progress
- [x] Done
- [!] Blocked / needs decision

---

## Batches
## Batches

### [x] Batch 1 — Aggregates + mobile-aligned 7-day window

- Covers [round7_parity.md §2, §5](../round7_parity.md): `buildMoodChartAggregates`, `filterLogsToLast7CalendarDays`, `rollingSevenDayRangeMs` (mirrors mobile `buildMoodCharts` window rules); web uses `durationMinutes` + `timestamp`.
- **Touched:** `src/utils/analytics/buildMoodChartAggregates.ts`, `src/utils/analytics/index.ts`
- **Notes:** Shared math for frequency (counts), duration (merged episodes clipped to range), intensity (avg 1–10 per mood).

### [x] Batch 2 — Hook: today + week chart series

- Covers [round7_parity.md §2](../round7_parity.md): `weekLogs` = last 7 calendar days; `todayMoodCharts` / `weekMoodCharts` + segment/bar memos; removed hourly pipeline.
- **Touched:** `src/hooks/useJournalAnalytics.ts`, `src/types/journalAnalytics.types.ts` (dropped `HourlyDot` when unused)
- **Notes:** Exports `todayFrequencySegments`, `weekFrequencySegments`, duration/intensity bars, `weekMoodCharts` / `todayMoodCharts`.

### [x] Batch 3 — Chart UI components

- Covers [round7_parity.md §4](../round7_parity.md): donut + horizontal bars; Aurora styling.
- **Touched:** `src/components/journal/MoodFrequencyDonut.tsx`, `MoodDurationBars.tsx`, `MoodIntensityBars.tsx`
- **Notes:** No extra chart libraries; conic donut + CSS bars.

### [x] Batch 4 — `AnalyticsTab`: replace hourly scatter + wire charts

- Covers [round7_parity.md §1, §3](../round7_parity.md): removed “Mood spikes in 24 hours”; Today + 7 days both show frequency / duration / average intensity.
- **Touched:** `src/components/journal/AnalyticsTab.tsx`
- **Notes:** Today / 7 days toggle kept; charts match mobile trio per tab scope.

### [x] Batch 5 — Selection + help + ethics copy

- Covers parity polish: donut legend toggles highlight; bars dim; `AnalyticsInfoModal`; guide strings from mobile copy (`src/constants/mood/journalAnalyticsGuideCopy.ts`).
- **Touched:** `AnalyticsTab.tsx`, `AnalyticsInfoModal.tsx`, `journalAnalyticsGuideCopy.ts`, bar/donut props for `selectedMood`
- **Notes:** Modal lives on parent `AnalyticsTab` so `guide` state is in scope.

### [x] Batch 6 — DRY `JournalMoodChartsSection`

- Covers [round7_parity.md §4](../round7_parity.md): single component for the three chart cards + ethics footer; Today/Week pass props only.
- **Touched:** `JournalMoodChartsSection.tsx`, `AnalyticsTab.tsx`
- **Notes:** Week view gains same clear-highlight + ethics line under charts as Today.

### [x] Batch 7 — Repo hygiene (adjacent typecheck fixes)

- Unrelated strict TS failures cleaned while validating build: sessions notes API barrel, unused imports, orphan mood updater removed (if applied).
- **Touched:** `src/services/sessions/index.ts`, `src/pages/counselor/Profile.tsx`, `src/services/counselor-checkin-context/get/fetchStudentCheckInContext.ts`, `src/services/mood/put/updateMoodLog.ts` _(delete or fix — list what you actually did)_
- **Notes:** Run `npm run typecheck` before merge.

---

## Cleanup log

| Date | Item | Reason |
|------|------|--------|
| 2026-05-13 | Hourly `HourlyDot` / `hourlyDots` / `computeHourlyDots` | Replaced by mobile-style mood charts per Round 7. |
| 2026-05-13 | `JournalMoodChartsSection` extraction | Removed duplicated Today/Week chart JSX in `AnalyticsTab`. |

---

## Open questions

- [x] Mobile **mood duration** — look-back from log timestamp + merge overlaps (`durationMinutes`).
- [x] Pie/donut weighting — **check-in counts** per mood.
- [x] **Today / 7 days** — kept toggle; charts scoped per tab like mobile (today logs vs last 7 calendar days).