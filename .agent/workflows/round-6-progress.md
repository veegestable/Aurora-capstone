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

- Covers [round6_parity.md §3](../round6_parity.md): define `.scrollbar-hide` (or `@utility`) in `src/index.css`; apply to `CounselorSessionsPane.tsx` tab strip + scrollable body; optionally counselor `Students.tsx` filter row.
- **Touched:** _(fill when done)_
- **Notes:** _(fill when done)_

### [ ] Batch 2 — `__AUTO_ACCEPTED__` conversation preview + thread text

- Covers [round6_parity.md §2](../round6_parity.md): new sanitizer module under `src/services/messages/`; use in `getConversationsForStudent.ts`, `getConversationsForCounselor.ts`; strip prefix in `getMessagesForStudent.ts` for text messages.
- **Touched:** _(fill when done)_
- **Notes:** _(fill when done)_

### [ ] Batch 3 — Student profile photos + Student Directory + dashboard chips

- Covers [round6_parity.md §1](../round6_parity.md): `getStudents.ts` maps `avatar_url`; `Students.tsx` / `CounselorDashboard.tsx` pass `LetterAvatar`.
- **Touched:** _(fill when done)_
- **Notes:** _(fill when done)_

### [ ] Batch 4 — Request Session: preferred date/time

- Covers [round6_parity.md §7](../round6_parity.md): `SessionRequestModal.tsx`, `createSessionRequest.ts`, `enqueueSessionRequestCounselorPush` preferred time; verify `ChatBubble` / `getMessagesForStudent` display.
- **Touched:** _(fill when done)_
- **Notes:** _(fill when done)_

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