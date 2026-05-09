# Round 6 Parity

## Objective

This document is the **6th Round of Parity** for the Aurora web app. It follows the merge of [Round 5 Parity](round5_parity.md) and addresses **post-merge QA feedback** (partner review) so the web app matches mobile behavior and polish: profile photos, counselor directory UI, message previews, dashboard scrollbars, mood assets, Zen audio, and student session-request flows.

Use this file as the source of truth for **what to implement** and **where to change code**.

---

## Partner feedback (original) → English backlog

| Area | Summary in English |
|------|---------------------|
| Counselor student directory | **Fetch and show profile pictures** for students; improve **labels and filters** in the UI for clarity and parity with mobile. |
| Messages | When **accepting a session invitation** from a student account, the conversation **list preview** still shows internal text like `__AUTO_ACCEPTED__` (should be hidden / replaced with human-readable copy, as on mobile). |
| Counselor dashboard — Sessions | The **Sessions** UI (calendar/clock entry) shows **visible horizontal and vertical scrollbars**; should match mobile polish (hide or style scrollbars). |
| Student mood check-in | **Mood visuals are not the same as mobile** — mobile uses **3D PNG** mood assets; web should align. |
| Zen / breathing exercises | **No audio** during breathing exercises for the tester; playback must work reliably on web. |
| Student — Messages | **No button to request a session** from the Messages screen (mobile has a clear path). |
| Student — Request Session | **Request Session** on the dashboard opens a flow **without date/time** selection; mobile includes preferred scheduling context. |

---

## Scope by feature

### 1. Profile photos and counselor Student Directory

- **`getStudents`** currently omits `avatar_url` from Firestore. Extend [`src/services/counselor/get/getStudents.ts`](../src/services/counselor/get/getStudents.ts) to map `avatar_url` (already optional on [`StudentInfo`](../src/services/counselor/types.ts)).
- **Counselor dashboard** — [`CounselorDashboard.tsx`](../src/pages/CounselorDashboard.tsx): pass `avatarUrl` into `StudentChip` / [`LetterAvatar`](../src/components/LetterAvatar.tsx).
- **Student Directory** — [`Students.tsx`](../src/pages/counselor/Students.tsx): include `avatar_url` in the mapped `StudentEntry` (avoid `(student as any).avatar_url`).
- **Filters / labels** — tighten filter chip row (spacing, hierarchy, optional `scrollbar-hide` on horizontal overflow) per [Aurora design system](workflows/aurora-design-system.md).

### 2. Message preview: `__AUTO_ACCEPTED__`

- Conversation list previews come from `lastMessage` in [`getConversationsForStudent.ts`](../src/services/messages/get/getConversationsForStudent.ts) and [`getConversationsForCounselor.ts`](../src/services/messages/get/getConversationsForCounselor.ts).
- Add a small **preview sanitizer** (e.g. strip `__AUTO_ACCEPTED__` prefix; match mobile `AUTO_ACCEPTED_PREFIX` behavior in the mobile codebase) so [`ContactRow`](../src/components/messages/ContactRow.tsx) never shows raw internal strings.

### 3. Counselor Sessions pane — scrollbars

- [`CounselorSessionsPane.tsx`](../src/components/counselor/CounselorSessionsPane.tsx) uses `scrollbar-hide` on the tab nav, but the utility may be **missing** from [`src/index.css`](../src/index.css).
- **Define** `.scrollbar-hide` (webkit + `scrollbar-width` fallbacks for Windows) and apply consistently to the tab strip and scrollable body where appropriate.

### 4. Student mood — 3D PNG parity

- Web uses vector [`MoodIcon.tsx`](../src/components/student/MoodIcon.tsx) in the check-in flow; mobile uses **3D PNG** assets.
- Import the same (or equivalent) assets into `public/` or `src/assets/` and update [`MoodCheckIn`](../src/components/MoodCheckIn.tsx) to use `<img>` where parity is required; keep accessible `alt` text.

### 5. Zen / breathing — audio

- [`BreathingExercise.tsx`](../src/components/student/BreathingExercise.tsx) uses [`zenSoundsService`](../src/services/zen-sounds/index.ts) with URLs from [`constants/zen/exercises.ts`](../src/constants/zen/exercises.ts).
- Fix **no-audio** cases: CDN/CORS/autoplay policy, or **self-host** short loops under `public/`; optionally require a user gesture to start audio on first open.

### 6. Student Messages — session request entry

- [`student/Messages.tsx`](../src/pages/student/Messages.tsx) is list-only.
- Add a **Request session** CTA (FAB or header action) that opens [`SessionRequestModal`](../src/components/sessions/SessionRequestModal.tsx), mirroring the counselor **Write Message** pattern in [`counselor/Messages.tsx`](../src/pages/counselor/Messages.tsx).

### 7. Request Session — date and time

- [`SessionRequestModal.tsx`](../src/components/sessions/SessionRequestModal.tsx): add **date + time** (or `datetime-local`) for preferred scheduling.
- [`createSessionRequest.ts`](../src/services/sessions/post/createSessionRequest.ts): persist preferred slot(s) / text so session messages and [`ChatBubble`](../src/components/messages/ChatBubble.tsx) show a real **preferred time** instead of “No preferred time”.
- Align fields with [`session.types`](../src/types/session.types.ts) and existing Firestore shape.

---

## Suggested implementation order

1. Define `scrollbar-hide` + conversation **preview sanitizer** (fast QA wins).  
2. **`getStudents` avatars** + counselor dashboard + student directory rows.  
3. **Session request date/time** (modal + service + types).  
4. Student Messages **Request session** CTA + retest invite/accept flows.  
5. **Mood PNG** assets.  
6. **Zen audio** reliability pass.  
7. Final **Student Directory** filter/label polish vs mobile.

---

## Coding standards

- Same as Round 5: **clean up** orphaned/deprecated code when touching areas; avoid unused variables.  
- **`services/`** structure: `get/`, `post/`, `put/`, `delete/`, `index.ts` barrel, `types.ts` as in Round 5.  
- Branding: follow [Aurora Design System](workflows/aurora-design-system.md) — dark AURORA palette, card/badge patterns, spacing.

---

## Workflows (required)

- **[web-refactor.md](workflows/web-refactor.md):** Vite + React 19, `react-router-dom` v7, Tailwind v4 + tokens in [`src/index.css`](../src/index.css), Context (not Zustand), `lucide-react`, Firebase. Services: `src/services/{feature}/{verb}/…` + barrel `index.ts`.  
- **[aurora-design-system.md](workflows/aurora-design-system.md):** Dark AURORA tokens; layout may differ on large viewports but **visual parity** with mobile for colors, typography hierarchy, and component styling.
- **Progress tracker:** **[round-6-progress.md](workflows/round-6-progress.md)** — update after each batch.

---

## Relation to Round 5

[Round 5 Parity](round5_parity.md) defined broad screen-by-screen parity. **Round 6** does not reopen all of Round 5; it closes **specific gaps** discovered in review after Round 5 shipped. Use Round 5 for context; use Round 6 for this sprint’s checklist.
