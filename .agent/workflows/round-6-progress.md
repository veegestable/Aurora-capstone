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

### [ ] Batch 5 — Student Messages: “Request session” entry point

- Covers [round6_parity.md §6](../round6_parity.md): FAB or header CTA on `student/Messages.tsx` + `SessionRequestModal` (mirror counselor `Messages.tsx`).
- **Touched:** _(fill when done)_
- **Notes:** _(fill when done)_

### [ ] Batch 6 — Mood check-in: 3D PNG parity

- Covers [round6_parity.md §4](../round6_parity.md): assets under `public/` or `src/assets/`; `MoodCheckIn` / mood picker uses PNGs; `alt` text.
- **Touched:** _(fill when done)_
- **Notes:** _(fill when done)_

### [ ] Batch 7 — Zen / breathing audio reliability

- Covers [round6_parity.md §5](../round6_parity.md): `constants/zen/exercises.ts`, `BreathingExercise.tsx`, `zen-sounds` — self-host audio, autoplay/gesture, errors surfaced.
- **Touched:** _(fill when done)_
- **Notes:** _(fill when done)_

### [ ] Batch 8 — Final sweep: cleanup + open questions

- Orphan removal / consistency; align with Round 5 cleanup log style.
- **Touched:** _(fill when done)_
- **Notes:** _(fill when done)_

---

## Cleanup log

| Date | Item | Reason |
|------|------|--------|
| _(add rows)_ | | |

---

## Open questions

- [ ] Confirm canonical Firestore field for student photos (`avatar_url` vs fallbacks).
- [ ] Preferred session time: ISO vs display string — align with mobile.
- [ ] Mood PNGs: copy from mobile vs new exports — team source of truth.