---
description: Round 5 web parity — batch progress tracker. Update after each batch.
---

# Round 5 Parity — Progress Tracker

Source plan: [round5_parity.md](../round5_parity.md)
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

### [x] Batch 1 — Mood data model + storage service
- **Touched:** `src/services/mood/types.ts`, `src/services/mood/post/createMoodLog.ts`,
  `src/services/mood/get/hasBathEntryForDayKey.ts`, `src/services/mood/get/hasMealEntryForDayKey.ts`,
  `src/services/mood/index.ts`, `src/services/firebase-storage/post/uploadImage.ts`,
  `src/services/firebase-storage/index.ts`
- **Notes:** New optional fields on `MoodLogEntryDoc` (`durationMinutes`, `bathTaken`,
  `mealResponses`, `journalImageUrl`, `detectionMethod`). No existing reader breaks.

### [x] Batch 2 — `useMoodCheckIn` rewrite + per-category templates
- **Touched:** `src/types/user-settings.types.ts`, `src/constants/mood/mealSchedule.ts`,
  `src/constants/mood/journalTemplates.ts`, `src/hooks/useMoodCheckIn.ts`
- **Notes:** Auto-journal now uses per-category narrative (mirrors mobile).
  Hook exposes meal/bath/photo/duration/pressure primitives but UI hasn't wired them yet.
  - 2.1: Moved `CONTEXT_CATEGORIES` to `journalTemplates.ts`; hook re-exports for backward-compat.

### [x] Batch 3 — Mood Check-in Step 1 UI
- **Touched:** `src/components/student/MoodIcon.tsx`, `src/components/MoodCheckIn.tsx`, `src/index.css` (slider thumb)
- **Notes:** Manual on left / Daily Selfie on right. SVG mood icons replace emoji glyphs.
  Hint popovers added for Manual / Intensity / Duration. New numeric Duration input
  with friendly category label. Footer shows Retake Photo + Use This Mood after AI detection.

### [ ] Batch 4 — Mood Check-in Steps 2 & 3 UI
- **Touched:**
- **Notes:**

### [ ] Batch 5 — Mood Check-in Done step
- **Touched:**
- **Notes:**

### [ ] Batch 6 — Student Dashboard pane + stability hint
- **Touched:**
- **Notes:**

### [ ] Batch 7 — Student Journal entry detail enrichment
- **Touched:**
- **Notes:**

### [ ] Batch 8 — Student Resources → Zen
- **Touched:**
- **Notes:**

### [ ] Batch 9 — Student Profile (Account Settings, Privacy, Reminders)
- **Touched:**
- **Notes:**

### [ ] Batch 10 — Counselor Dashboard restructure
- **Touched:**
- **Notes:**

### [ ] Batch 11 — Counselor Student Profile (full info + day detail + Special Population)
- **Touched:**
- **Notes:**

### [ ] Batch 12 — Counselor Messages (Write Message, DM session card, Reschedule)
- **Touched:**
- **Notes:**

### [ ] Batch 13 — Counselor Profile cleanup
- **Touched:**
- **Notes:**

### [ ] Batch 14 — Final cleanup sweep
- **Touched:**
- **Notes:**

---

## Cleanup log

Items removed or refactored as orphans/deprecated. Add a row when you delete
or substantially reshape something so future batches don't reintroduce it.

| Date       | Item                                                  | Reason                              |
|------------|-------------------------------------------------------|-------------------------------------|
| 2026-05-07 | `CONTEXT_CATEGORIES` inline tag arrays in `useMoodCheckIn.ts` | Duplicated `SCHOOL_TAGS` / `HEALTH_TAGS` / etc. from `journalTemplates.ts`; consolidated into a single source of truth. |

---

## Open questions

Capture decisions that need confirmation before continuing.

- [ ] Is `src/pages/student/DailySelfie.tsx` still needed once Step 1 owns the selfie flow? (route: `App.tsx:81`)
- [ ] Should the Counselor Profile keep the STUDENTS / SESSIONS stat row, or remove per plan §3.5?
- [ ] Reschedule flow: new `services/sessions/put/rescheduleSession.ts` or extend `updateSessionStatus`?