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

### [x] Batch 4 — Mood Check-in Steps 2 & 3 UI
- **Touched:** `src/components/MoodCheckIn.tsx`
- **Notes:** Added Meal Check-in (per `mealSchedule`), Bath Check-in (locks on "Yes"),
  hint icons across vitals, dynamic Pressure pill, and a photo attachment with
  Firebase Storage upload on submit. Sleep card now shows a "locked until tomorrow"
  notice once captured instead of disappearing.

### [x] Batch 5 — Mood Check-in Done step
- **Touched:** `src/components/student/QuickResetBreathing.tsx`,
  `src/components/MoodCheckIn.tsx`
- **Notes:** Replaced hardcoded streak/check-ins with values from `getMoodLogs` +
  `computeStreak`. Inline 60s breathing widget replaces the old "navigate to
  Resources" recommendation. Added optional School pressure today sub-pill driven
  by `schoolTagCount`. "Talk to a Counselor" now closes the modal cleanly
  without the page-reload side effect.

### [x] Batch 6 — Student Dashboard pane + stability hint
- **Touched:** `src/services/sessions/get/getCounselorNamesForSessions.ts`,
  `src/services/sessions/index.ts`,
  `src/components/student/StudentSessionsPane.tsx`,
  `src/pages/StudentDashboard.tsx`
- **Notes:** Welcome row gains a CalendarClock launcher for a Future / Past / Closed
  sessions modal with a Go to Messages shortcut. Today's Stability card gains a `?`
  icon that opens a centered explainer modal.

### [x] Batch 7 — Student Journal entry detail enrichment
- **Touched:** `src/constants/mood/journalTemplates.ts`,
  `src/components/MoodCheckIn.tsx`,
  `src/components/journal/MoodLogEntry.tsx`
- **Notes:** Mood log detail now shows Mood Duration, Bath, Meals, Photo, and an
  Academic Insight pill alongside the existing context. Stress/Energy display
  fixed from /10 to /5. Photo opens in a lightbox. `getDurationCategoryLabel`
  promoted from `MoodCheckIn.tsx` to `journalTemplates.ts` (single source of truth).

### [x] Batch 8 — Student Resources → Zen rebuild
  - Added `src/constants/zen/exercises.ts` with `BREATHING_EXERCISES`, `DURATION_OPTIONS_MINUTES`, and phase/cycle helpers ported from mobile `breathing-data.ts` (web-safe, no `require()` assets).
  - Slimmed `src/services/zen-sounds/types.ts` to a minimal `Track` and rewired `zen-sounds/index.ts` to honor per-track volume.
  - Rewrote `src/pages/student/Resources.tsx` as the Zen page (heading + duration picker + exercise cards). Removed `MOCK_RESOURCES`, search bar, and category tabs.
  - Rewrote `src/components/student/BreathingExercise.tsx` to drive phases, audio, and timer from the new exercise data; auto-pauses when the session timer ends.
  - Deleted `src/components/student/ResourceCard.tsx` (no longer referenced).

### [x] Batch 9 — Student Profile (Account Settings, Privacy, Reminders)
  - Added `src/constants/student/programs.ts` (CCS / degree options + helpers ported from mobile).
  - Extended `User`, `UserProfile`, and `UpdateProfileData` with `program` and `contact_number`; `AuthContext.convertUserProfile` now passes them through.
  - Reworked `PrivacyRow` to be expandable (preview ↔ description with chevron) and `ToggleRow` to support `disabled` + `statusBadge`.
  - Added `SettingsRow` (chevron tap row), `TimePickerModal` (shared bath / wake / reminder picker), and `MealScheduleModal` (count + per-meal time inputs).
  - Rebuilt `EditProfileModal` to mobile parity: program dropdown, contact number, fixed-CCS department, mobile-style validation, dark theme.
  - Rewrote `Profile.tsx` into Account Settings → Personal Details → Privacy Transparency (expandable) → App Preferences (Session updates / Daily Reminders / Reminder time) → Logout, driven by `useUserDaySettings()` for live persistence.

### [x] Batch 10 — Counselor Dashboard restructure
  - Added `src/components/counselor/CounselorSessionsPane.tsx` (CalendarClock pane that loads counselor sessions + student names, splits them into Pending / Upcoming / Reschedule / Completed / Expired / Closed, and routes chip taps to `/counselor/session-history` with `state.openSessionId` + `state.statusFilter` for the upcoming detail panel).
  - Rewrote `src/pages/CounselorDashboard.tsx` to the 3-section layout (Dashboard Overview, Students, Announcements) with the calendar-clock icon next to the welcome line; reused `AnnouncementBanner` + `AnnouncementFormModal` (Add Announcement) and removed the legacy Recent Flags / Unread Messages / Pending Session lists.
  - Counselor signal logic and check-in context service now live only on the Students Directory page, where they belong.

- [ ] (deferred to Batch 12) `SessionHistory.tsx` consumes `location.state.statusFilter` / `openSessionId` and gains the matching filter chips for Pending / Confirmed / Expired / Reschedule.

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
| 2026-05-07 | `CLOSED_STATUSES` constant in `StudentSessionsPane.tsx` | Unused — `bucketFor` falls through to `'closed'`. Replaced with an inline comment for intent. |

---

## Open questions

Capture decisions that need confirmation before continuing.

- [ ] Is `src/pages/student/DailySelfie.tsx` still needed once Step 1 owns the selfie flow? (route: `App.tsx:81`)
- [ ] Should the Counselor Profile keep the STUDENTS / SESSIONS stat row, or remove per plan §3.5?
- [ ] Reschedule flow: new `services/sessions/put/rescheduleSession.ts` or extend `updateSessionStatus`?