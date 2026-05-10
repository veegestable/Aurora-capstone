---
description: Round 6 web parity — batch progress tracker. Update after each batch.
---

# Round 6 Parity — Progress Tracker

Source plan: [round6_parity.md](../round6_parity.md)

Standards: [aurora-design-system.md](aurora-design-system.md), [web-refactor.md](web-refactor.md)

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

### [x] Batch 1 — Scrollbar utility + Counselor Sessions pane

- Covers [round6_parity.md §3](../round6_parity.md): define `.scrollbar-hide` in `src/index.css`; apply to Sessions tab strip + scrollable regions; optional counselor Students filter row + Session History chip row.
- **Touched:** `src/index.css`, `src/components/counselor/CounselorSessionsPane.tsx`, `src/pages/counselor/Students.tsx`, `src/pages/counselor/SessionHistory.tsx`
- **Notes:** Utility hides native scrollbars (webkit + Firefox) on horizontal tab/filter rows and vertical session lists so Windows no longer shows persistent bars; pane body uses the same class where overflow scrolls.

### [x] Batch 2 — `__AUTO_ACCEPTED__` conversation preview + thread text

- Covers [round6_parity.md §2](../round6_parity.md): sanitizer module + conversation getters + DM text mapping.
- **Touched:** `src/services/messages/sanitizeMessageText.ts`, `src/services/messages/get/getConversationsForStudent.ts`, `src/services/messages/get/getConversationsForCounselor.ts`, `src/services/messages/get/getMessagesForStudent.ts`
- **Notes:** `formatConversationPreview` strips `__AUTO_ACCEPTED__` for inbox previews; `stripAutoAcceptedPrefix` applied to plain `content` in `getMessagesForStudent` so thread bubbles match mobile behavior.

### [x] Batch 3 — Student profile photos + Student Directory + dashboard chips

- Covers [round6_parity.md §1](../round6_parity.md).
- **Touched:** `src/services/counselor/get/getStudents.ts`, `src/pages/counselor/Students.tsx`, `src/pages/CounselorDashboard.tsx`
- **Notes:** `StudentInfo.avatar_url` populated from Firestore; directory rows and dashboard chips use `LetterAvatar`; filter strip has “Filter by signal” label + `scrollbar-hide` + `aria` on toolbar buttons.

### [x] Batch 4 — Request Session: preferred date/time
- **Touched:** `src/components/sessions/SessionRequestModal.tsx`, `src/services/sessions/post/createSessionRequest.ts`
- **Notes:** `datetime-local` → formatted `preferredTime`; session doc + `sessionData` + `lastMessage` summary already handled in service.

### [x] Batch 5 — Student Messages: “Request session” entry point
- **Touched:** `src/pages/student/Messages.tsx`, `src/types/message.types.ts`, `src/services/messages/classifyConversationPreview.ts`, `src/services/messages/get/getConversationsForStudent.ts`, `src/services/messages/get/getConversationsForCounselor.ts`, `src/components/messages/ContactRow.tsx`
- **Notes:** FAB opens `SessionRequestModal`; list `relative pb-24`. Conversation previews use `previewKind` + badges in `ContactRow`; `session_topic` for mobile-style `Session: {title}` (e.g. Academic Guidance), plus session request / invite / started.

### [x] Batch 6 — Mood check-in: PNG parity (mobile `moodIcon`) + wizard polish

- Covers [round6_parity.md §4](../round6_parity.md): emotion art aligned with mobile; related wizard UX in the same files.
- **Touched:** `public/images/moodIcon/*.png`, `src/constants/mood/moodIconPng.ts`, `src/components/student/MoodIcon.tsx`, `src/components/MoodCheckIn.tsx`, `src/index.css`
- **Notes:** PNGs from `mobile/src/assets/moodIcon/` served at `/images/moodIcon/*.png`; `MoodIcon` prefers PNG, vector fallback on error. Dashboard + Step 1 manual grid use `MoodIcon`. **Theming:** `moodAccent` from `getBlendedColorWeighted(selectedEmotions)` for progress bar, modal edge, mode toggle, intensity readout + `--thumb-mood` on intensity slider. **Step 2:** `.vital-range-slider` + `--thumb-vital` on Energy (green) / Stress (red); custom `style` vars cast `as React.CSSProperties`.

### [x] Batch 7 — Zen / breathing audio reliability

- Covers [round6_parity.md §5](../round6_parity.md): `constants/zen/exercises.ts`, `BreathingExercise.tsx`, `zen-sounds` — self-host audio, autoplay/gesture, errors surfaced.
- **Touched:** `public/sounds/breathing/*.mp3`, `src/constants/zen/exercises.ts`, `src/services/zen-sounds/types.ts`, `src/services/zen-sounds/index.ts`, `src/components/student/BreathingExercise.tsx`
- **Notes:** Copied 5 MP3s from mobile assets to `public/sounds/breathing/` with web-safe names; replaced Pixabay CDN URLs with local `/sounds/breathing/` paths. `ZenSoundsService` rewritten with subscribe-based `ZenPlaybackState` (loading/error), `canplaythrough` + `error` listeners, and `NotAllowedError` (autoplay policy) graceful handling. `BreathingExercise` starts paused with a "Tap to Start" CTA so the first `play()` originates from a real user gesture; error banner shown if audio load fails; ambient card shows "Loading audio…" while buffering.


### [x] Batch 8 — Final sweep: cleanup + open questions
- Orphan removal / consistency; align with Round 5 cleanup log style.
- **Touched:** `src/components/MoodCheckIn.tsx` (deleted), `src/components/mood-checkin/` (new: `index.ts`, `MoodCheckIn.tsx`, `HintSystem.tsx`, `StepMoodSelection.tsx`, `StepVitals.tsx`, `StepContext.tsx`, `StepSummary.tsx`, `WizardFooter.tsx`), `src/pages/StudentDashboard.tsx`, `src/pages/counselor/StudentWorkspace.tsx`, `src/services/sessions/post/studentConfirmFinalSlot.ts`
- **Notes:** **Modularization:** Split 1025-line `MoodCheckIn.tsx` into 8 files under `mood-checkin/` folder with barrel export. **`as any` removal:** Removed all `as any` casts — `StudentWorkspace` used unnecessary cast on `StudentInfo` (already typed), `studentConfirmFinalSlot` used cast on Firestore `updateDoc` patch (fixed with index signature). Open questions (avatar field, session time format) deferred as non-blocking design decisions.

---

## Cleanup log

| Date | Item | Reason |
|------|------|--------|
| 2026-05-09 | `/moodIcon/` URL map vs `public/images/moodIcon/` | Fixed by mapping `/images/moodIcon/...` so PNGs load instead of SVG fallback. |
| 2026-05-11 | `MoodCheckIn.tsx` → `mood-checkin/` | Modularized 1025-line monolith into 8 focused files. |
| 2026-05-11 | `as any` casts (2 files) | Removed unsafe casts in `StudentWorkspace.tsx` and `studentConfirmFinalSlot.ts`. |

---

## Open questions

- [ ] Confirm canonical Firestore field for student photos (`avatar_url` vs fallbacks).
- [ ] Preferred session time: ISO vs display string — align with mobile.
- [x] Mood PNGs — **Batch 6:** use `mobile/src/assets/moodIcon/` → `public/images/moodIcon/`.