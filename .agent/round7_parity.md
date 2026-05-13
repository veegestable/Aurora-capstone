# Round 7 Parity

## Objective

This document is the **7th Round of Parity** for the Aurora web app. It follows [Round 6 Parity](round6_parity.md) and closes the remaining **student Journal → Analytics** gap called out in partner review: analytics should show **mood frequency (pie)**, **mood duration (bar)**, and **mood intensity (bar)** over the **last 7 days**, and should **not** keep the **“today only”** hourly scatter (“Mood spikes in 24 hours”) as the primary analytics graphic.

Use this file as the source of truth for **what to implement** and **where to change code**.

---

## Partner feedback (original) → English backlog

| Original (Bisaya / mix) | Summary in English |
|-------------------------|-------------------|
| *“kuan naa lang kuwang sa analytics ra graph”* | The **only** remaining gap is **analytics / the graphs** — other areas are acceptable. |
| *“mood frequency (pie graph), mood duration (bar graph), og mood intensity (bar graph)”* | Analytics must include **three** visualizations: **frequency → pie**, **duration → bars**, **intensity → bars**. |
| *“wala nani today na analytics… puli ana… mood frequency, duration, og intensity same sa last 7 days”* | Drop the **today-centric** analytics treatment (specifically the **24-hour hourly** view). Replace it with the **same last-7-days-style** trio: frequency, duration, intensity — consistent with mobile. |

---

## Scope by feature

### 1. Remove today-only hourly scatter as the analytics centerpiece

- **Current web UI:** [`src/components/journal/AnalyticsTab.tsx`](src/components/journal/AnalyticsTab.tsx) — `TodayView` ends with **“Hourly Trend” / “Mood spikes in 24 hours”** (scatter-style dots over 00h–24h), driven by [`computeHourlyDots`](src/hooks/useJournalAnalytics.ts) and [`hourlyDots`](src/hooks/useJournalAnalytics.ts) from **today’s** logs only.
- **Target:** Remove this block (and its supporting hook exports / types) once the replacement charts ship, so we do **not** leave orphaned `HourlyDot` helpers or unused legends.

### 2. Align analytics structure with mobile (last 7 days)

- **Rolling window:** All three charts use **last 7 days** of mood logs (same mental model as **`WeekView`** intro in `AnalyticsTab` — [`weekLogs`](src/hooks/useJournalAnalytics.ts)).
- **Mood frequency — pie chart:** Share of check-ins (or weighted representation — **confirm against mobile**) per emotion / mood label; colors from emotion palette [`getEmotionColor`](src/utils/moodColors.ts) / [Aurora mood colors](workflows/aurora-design-system.md).
- **Mood duration — bar chart:** Bars per mood (or per day × mood — **confirm against mobile**). If mobile defines “duration” as time-between-check-ins, time-in-mood, or another field, **match that definition** and map from [`MoodLogEntryRow`](src/services/mood/types.ts) accordingly.
- **Mood intensity — bar chart:** **Bar** chart (not the hourly scatter): e.g. average intensity per day for the window, or average intensity per dominant mood — **match mobile**.

### 3. Journal Analytics UX: Today vs 7 days toggle

- Partner intent: **no separate “today analytics”** that duplicates a different chart set. Options to implement (pick one and document in [round-7-progress.md](workflows/round-7-progress.md)):
  - **A)** Remove the **Today / 7 days** toggle; single analytics view with the three charts + any retained copy (insights) still scoped to 7 days; or  
  - **B)** Keep a **Today** tab only for **non-chart** summary (e.g. today mood, check-in count) if mobile still shows it, but **charts** are always **last 7 days** on both tabs; or  
  - **C)** Match mobile exactly (preferred): mirror mobile’s tab structure and labels.

**Default recommendation:** Start from **mobile** `Journal` / analytics screen file(s) and mirror structure before locking A/B/C.

### 4. Modularity

- Prefer **small presentational components** under `src/components/journal/` (e.g. `MoodFrequencyPie.tsx`, `MoodDurationBars.tsx`, `MoodIntensityBars.tsx`) or a single `analytics/charts/` folder with a barrel `index.ts`, reusing patterns from [`ProgressBarList`](src/components/journal/ProgressBarList.tsx).
- Keep **data shaping** in [`useJournalAnalytics.ts`](src/hooks/useJournalAnalytics.ts) (or `src/utils/analytics/` if pure functions grow) so `AnalyticsTab` stays layout + composition.

### 5. Types and services

- Extend [`src/types/journalAnalytics.types.ts`](src/types/journalAnalytics.types.ts) with explicit types for pie slices and bar series; remove [`HourlyDot`](src/types/journalAnalytics.types.ts) when the hourly chart is deleted.
- Reuse [`moodService.getMoodLogs`](src/services/mood) — no new backend unless mobile requires fields web does not yet persist.

---

## Suggested implementation order

1. **Mobile reference pass** — capture exact chart math, labels, and screen structure from the Expo app.  
2. **Hook:** Add memoized selectors for 7-day frequency, duration, and intensity series; remove `hourlyDots` / `computeHourlyDots` when UI is gone.  
3. **Charts:** Implement pie + two bar charts with Aurora tokens and accessible text (labels, `aria-*` where appropriate).  
4. **AnalyticsTab:** Replace `TodayView` hourly section; reconcile **Today / 7 days** toggle per scope §3.  
5. **Cleanup:** Delete unused types, imports, and any dead chart CSS; run a quick grep for `hourlyDots` / `HourlyDot` / `Mood spikes`.

---

## Coding standards (Round 7)

- **Ask Mode or Snippet Mode:** When executing this plan, the AI should **not** rely on large blind refactors. Prefer **[mobile-feature-parity.md](workflows/mobile-feature-parity.md)** style: **read-only** assistance with **copy-paste-ready snippets**, or **small, explicit** edits only when the user opts into Agent mode.  
- **Strict variables:** If a variable is declared in a function, it **must** be used; otherwise **do not** declare it. Same for hook return shapes — avoid exporting unused fields.  
- **Modularity:** One concern per file for new chart components; shared scales/legends only where duplicated.  
- **Code cleanup / tech debt:** Whenever code in this area changes, **scan for orphaned or deprecated** helpers, types, and UI and **remove** them in the same batch (no leftover `HourlyDot` pipeline).  
- **Services layout:** Keep `src/services/{feature}/{verb}/…` + barrels as in prior rounds.  
- **Branding:** [Aurora Design System](workflows/aurora-design-system.md) — dark surfaces, `card-aurora`, purple section labels, emotion colors for data visualization.

---

## Workflows (required)

- **[web-refactor.md](workflows/web-refactor.md):** Vite + React 19, `react-router-dom` v7, Tailwind v4 + tokens in [`src/index.css`](../src/index.css), Context (not Zustand), `lucide-react`, Firebase.  
- **[mobile-feature-parity.md](workflows/mobile-feature-parity.md):** Feature gaps closed with **Ask Mode**-style, paste-ready snippets; strict variable usage; no dead code.  
- **[aurora-design-system.md](workflows/aurora-design-system.md):** Dark AURORA tokens; chart and card styling consistent with mobile.  
- **Progress tracker:** **[round-7-progress.md](workflows/round-7-progress.md)** — update after each batch.

---

## Relation to Round 6

[Round 6 Parity](round6_parity.md) addressed directory, messages, sessions, mood PNGs, Zen audio, and mood check-in modularization. **Round 7** is **narrowly scoped to Journal analytics charts** and does not reopen unrelated Round 6 items unless review finds regressions.
