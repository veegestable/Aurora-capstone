---
description: 
---

# Mobile Feature Parity — Progress Log

**Last updated:** April 27, 2026
**Parent workflow:** `.agent/workflows/mobile-feature-parity.md`
**Mode:** Ask Mode (read-only, copy-paste snippets)

---

## How to Resume

1. Open `.agent/workflows/mobile-feature-parity.md` for full context on rules, branding tokens, architecture, and remaining feature specs.
2. The next item to implement is **E2 (StudentProfileModal with check-in summary)**.
3. Follow the same pattern used for previous phases: read the mobile reference files, read the web files, provide complete copy-paste-ready snippets with exact file paths.
4. Note on branding: student-facing surfaces use the Aurora dark theme tokens listed in the workflow doc. Admin pages use a lighter palette (`bg-white` cards with `text-aurora-primary-dark`, `bg-aurora-secondary-blue`, `border-aurora-gray-200`). Match the surrounding page when in doubt — see `src/pages/admin/Counselors.tsx` for the admin pattern and `src/pages/StudentDashboard.tsx` for the student pattern.
5. **Cleanup gate (E2):** After E2 is done, delete `riskHelpers.ts`, `risk.types.ts`, `StudentDetail.tsx`, `StudentOverviewTab.tsx`, `RiskCenter.tsx`. Move `formatTimeAgo` to a general util (e.g., `src/utils/dateHelpers.ts`) first.

---

## Completed Phases

### A1: Counselor Messages Query Fix ✅

**Problem:** `src/pages/counselor/Messages.tsx` called `getConversationsForStudent(user.id)` which queries `studentId == userId`. For a counselor, this returns nothing.

**Files created/modified:**
- `src/types/message.types.ts` — Added `StudentContact` interface (extends `CounselorContact` with `isAlerted`, `borderColor`, `program`, `studentId`)
- `src/services/messages/getConversationsForCounselor.ts` — **New.** Queries `conversations` where `counselorId == userId`, reads student info, checks `unreadCountCounselor`
- `src/services/messages/index.ts` — Added `getConversationsForCounselor` export
- `src/pages/counselor/Messages.tsx` — Swapped to `getConversationsForCounselor`, uses `StudentContact` type, "Priority" filter uses `isAlerted`

---

### B1: Real AI Emotion Detection ✅

**Problem:** `src/components/EmotionDetection.tsx` used `mockEmotionAnalysis()` with random fake results.

**Files created/modified:**
- `src/components/EmotionDetection.tsx` — Replaced mock with real `fetch` to `VITE_EMOTION_API_URL/api/emotion/analyze-upload`. Converts data URL → Blob → FormData. Parses `{ success, face_detected, emotions: { name: score } }`. Added `getEmotionColor()` helper.
- `.env.example` — Added `VITE_EMOTION_API_URL`

**Note:** Browser `fetch` with `FormData` must NOT set `Content-Type` header (browser auto-sets boundary).

---

### B2: Dynamic Student Dashboard Metrics ✅

**Problem:** `src/pages/StudentDashboard.tsx` had hardcoded streak (7), trend ("Stable"), and AI insight text.

**Files created:**
- `src/utils/analytics/computeStreak.ts` — Consecutive calendar days with logs ending at today
- `src/utils/analytics/computeTrend.ts` — Compares avg energy of last 3 logged days vs prior 3; returns "Improving" / "Stable" / "Declining"
- `src/utils/analytics/computeDailyInsight.ts` — Stress-band feedback from latest log's energy level (ported from mobile's `ethicsDailyAnalytics.ts`)
- `src/utils/analytics/index.ts` — Barrel export

**Files modified:**
- `src/pages/StudentDashboard.tsx` — Fetches last 30 days of mood logs on mount + after check-in (`onMoodLogged={loadStats}`). Replaces hardcoded values. Trend icon is dynamic (`TrendingUp` / `Minus` / `TrendingDown`). Card heading changed from "AI Insight" to "Daily Note".

---

### B3: Session Request and Invite Flow ✅

**Problem:** "Request Session" button had a TODO. No session types, Firestore integration, or modals.

**Files created:**
- `src/types/session.types.ts` — `SessionStatus` union, `TimeSlot`, `Session` interface (mirrors mobile's `sessions` collection schema)
- `src/services/sessions/post/createSessionRequest.ts` — Creates `sessions` doc + adds `session_request` message to conversation. Creates conversation doc if it doesn't exist.
- `src/services/sessions/get/getSessionsForStudent.ts` — Queries `sessions` where `studentId == userId`
- `src/services/sessions/get/getSessionsForCounselor.ts` — Queries `sessions` where `counselorId == userId`
- `src/services/sessions/put/updateSessionStatus.ts` — Updates session status, confirmedSlot, cancelReason, attendanceNote
- `src/services/sessions/index.ts` — Barrel export as `sessionsService`
- `src/components/sessions/SessionRequestModal.tsx` — Centered overlay modal. Fetches approved counselors from Firestore. Student selects counselor + writes note. Calls `sessionsService.createSessionRequest()`.
- `src/components/sessions/SessionCard.tsx` — Displays session with status badge, time slot, note, optional action button. Status colors for all 9 session states.

**Files modified:**
- `src/pages/StudentDashboard.tsx` — Wired "Request Session" button to open `SessionRequestModal`
- `src/pages/CounselorDashboard.tsx` — Added pending session requests section with `SessionCard` grid, session count in stat cards

**Firestore indexes needed:** `sessions` collection needs composite indexes for `studentId + updatedAt` and `counselorId + updatedAt`.

**Note:** `createSessionRequest.ts` has a dynamic `import()` of `setDoc` that works but could be a static import for cleanliness.

---

### B4: Counselor Dashboard Dynamic Stats ✅

**Problem:** "New Messages" (hardcoded 3) and "Pending Follow-ups" (hardcoded 8) were static.

**Files modified:**
- `src/pages/CounselorDashboard.tsx` — Added `unreadMessages` state. Fetches conversations via `messagesService.getConversationsForCounselor()` in parallel with sessions using `Promise.all`. Wired "Unread Messages" card to real count. Renamed "Pending Follow-ups" to "Session Requests". Unread dot only shows when count > 0.

---

### C1: Online Presence (Green Dot) ✅

**Problem:** No presence system on web. Mobile counselors could not see when web students were online and vice versa.

**Files created (service — follows verb-based subfolder pattern from `sessions/`):**
- `src/services/presence/helpers.ts` — Private constants + `PRESENCE_PATH`, `presenceRef()`, `logPresenceError()`
- `src/services/presence/get/isPresenceAvailable.ts` — Returns `true` if RTDB is initialized
- `src/services/presence/get/subscribeToUsersPresence.ts` — Live subscription to multiple UIDs via `onValue`
- `src/services/presence/post/startMyPresence.ts` — Writes `{ online: true, lastSeen }` to `presence/{uid}`, registers `onDisconnect` offline write, wires `visibilitychange` for tab backgrounding
- `src/services/presence/put/setMyPresenceOfflineNow.ts` — Explicit offline write (must be called before `signOut()` — RTDB rules reject writes from unauthenticated clients)
- `src/services/presence/index.ts` — Barrel export as `presenceService`

**Files created (hooks):**
- `src/hooks/usePeerPresence.ts` — Returns `boolean` for a single peer; also exports `useUsersPresence(uids)` for a list → `Map<string, boolean>`
- `src/hooks/usePresence.ts` — Convenience hook for the current user's own status + RTDB availability flag

**Files modified:**
- `src/config/firebase.ts` — Added `getDatabase` import, `databaseURL` with an inferred fallback (`<projectId>-default-rtdb.asia-southeast1.firebasedatabase.app`), nullable `rtdb` export with warning log when `VITE_FIREBASE_DATABASE_URL` is missing
- `src/contexts/AuthContext.tsx` — `onAuthStateChanged` now calls `presenceService.startMyPresence(uid)` and stores the returned cleanup; `signOut()` calls `setMyPresenceOfflineNow(uid)` **before** `authService.signOut()` to avoid RTDB permission errors
- `src/components/messages/ContactRow.tsx` — Uses `usePeerPresence(contact.uid)`; green dot now reflects real-time status
- `src/components/messages/DirectMessageView.tsx` — Chat header avatar + "Online" text driven by `usePeerPresence`
- `.env.example` — Added `VITE_FIREBASE_DATABASE_URL`

**Pitfall (found during testing):** Initially the mobile counselor could see the web student online but not vice versa — because the web `ContactRow`/`DirectMessageView` were still reading a static `contact.isOnline` field (hardcoded to `false` by the messages service). The fix was wiring the `usePeerPresence` hook into both components.

**RTDB rules suggestion** (add to Realtime Database in Firebase console):
```
{
  "rules": {
    "presence": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

---

### C2: Announcements System ✅

**Problem:** Admin announcements page was a placeholder. No student-facing display. No service.

**Files created (types + service — verb-based subfolder pattern):**
- `src/types/announcement.types.ts` — `Announcement`, `CreateAnnouncementInput`, `UpdateAnnouncementInput`, `AnnouncementTargetRole` (`'all' | 'student' | 'counselor'`)
- `src/services/announcements/helpers.ts` — Private: `THREE_WEEKS_MS` TTL, `MOCK_ANNOUNCEMENTS` fallback, `mapAnnouncementsForRole` (filters by role + TTL), `mapAnnouncementsAll` (admin view)
- `src/services/announcements/get/listForRole.ts` — One-shot fetch with role/TTL filter, mock fallback on error
- `src/services/announcements/get/subscribeForRole.ts` — Live subscription with role/TTL filter, mock fallback on error
- `src/services/announcements/get/listAll.ts` — Admin-only unfiltered one-shot fetch
- `src/services/announcements/get/subscribeAll.ts` — Admin-only unfiltered live subscription
- `src/services/announcements/post/createAnnouncement.ts` — Creates `announcements` doc with `createdAt` server timestamp
- `src/services/announcements/post/uploadAnnouncementImage.ts` — Uploads `File` to Storage at `announcements/{uid}/{timestamp}.jpg`
- `src/services/announcements/put/updateAnnouncement.ts` — Partial update; `imageUrl: null` removes the image
- `src/services/announcements/delete/deleteAnnouncement.ts` — Removes the doc (does not purge Storage image — future cleanup)
- `src/services/announcements/index.ts` — Barrel export as `announcementsService`

**Files created (UI):**
- `src/components/announcements/AnnouncementBanner.tsx` — Auto-rotating carousel (5s interval, pause on hover), dot pagination, arrow nav visible on hover, click opens detail modal, `compact` prop hides the internal header. Uses `subscribeForRole`.
- `src/components/announcements/AnnouncementDetailModal.tsx` — Read-only expanded view with image, title, content, meta (author + date + target role).
- `src/components/announcements/AnnouncementFormModal.tsx` — Admin create/edit modal. Single component handles both flows via optional `announcement` prop. Image upload uses native `<input type="file">`. Tracks three image states (existing / picked / removed) so pure text edits never touch Storage.
- `src/components/announcements/AnnouncementAdminCard.tsx` — Admin list row with thumbnail, target-role badge, meta, Edit/Delete icon buttons.

**Files modified:**
- `src/pages/admin/Announcements.tsx` — Replaced `AdminPlaceholder` with full CRUD page. Live subscription via `subscribeAll`, filter chips (All / Students / Counselors), `window.confirm` delete, wired to `AnnouncementFormModal`.
- `src/pages/StudentDashboard.tsx` — Added `AnnouncementBanner` in a 2-col grid **below** Mood Check-in / Quick Actions / Stats, paired with the Daily Note card. Initial placement at the very top of the dashboard was reverted on design review — it visually out-competed the Mood Check-in which is the dashboard's primary action.

**Web-vs-mobile differences:**
- Mobile had separate `AddAnnouncementModal` and `EditAnnouncementModal`; web uses a single `AnnouncementFormModal` with mode driven by the `announcement` prop.
- Mobile uses `expo-image-picker` and `uploadImage(path, uri)`; web uses HTML `<input type="file">` with a `File` + Firebase Storage `uploadBytes` directly.

**Pitfalls (found during testing):**
- Initial "not showing" complaint was transient caching — the banner did subscribe correctly. Added a debug log briefly, reverted once confirmed working.
- Design review on placement: a full-width Announcements section at the top of the student dashboard violates the content hierarchy (Mood Check-in is the primary CTA). Pair with the Daily Note in a 2-col grid below the stats instead.

---

## Remaining Phases

### Phase C: Medium Priority (real-time + communication)

| Item | Description | Effort |
|------|-------------|--------|
| **C3** | Audit logging — write on sensitive actions + admin log viewer | ~~Medium~~ ✅ Done |
| **C4** | OpenAI weekly analytics narrative | ~~Small~~ ✅ Done |
| **C5** | Counselor session history screen + route | ~~Medium~~ ✅ Done |

### Phase D: Low Priority (polish)

| Item | Description | Effort |
|------|-------------|--------|
| **D1** | Zen ambient audio playback (HTML5 Audio API) | ~~Small~~ ✅ Done |
| **D2** | Admin settings page (replace placeholder) | ~~Small~~ ✅ Done |

### Phase E: New Mobile Features (Round 2 audit)

| Item | Description | Effort |
|------|-------------|--------|
| **E1** | Counselor Signals system (replace risk levels with ethics-compliant signal pills) | ~~Large~~ ✅ Done |
| **E4** | Mood V2 dual-source merging (legacy `mood_logs` + v2 `moodLogs/{uid}/entries`) | ~~Medium~~ ✅ Done |
| **E2** | StudentProfileModal with check-in summary | Medium |
| **E3** | Daily Selfie Screen | ~~Small~~ ✅ Done |
| **E5** | UserDaySettings context | ~~Medium~~ ✅ Done |
| **E6** | Weekly Summary via Cloud Functions | ~~Small~~ ✅ Done |
| **E7** | Counselor Profile — Edit Modal + avatar upload | Medium |

**E1 details:**
- Created `src/constants/counselor-checkin-signals.ts` — `CounselorSignalPill` type, label/sort maps, `counselorSignalFromLogs()` derivation
- Created `src/constants/counselor/counselor-checkin-policy.ts` — 3-day window, visible summary text
- Created `src/services/counselor-checkin-context/get/fetchStudentCheckInContext.ts` — checks `userSettings.shareCheckInsWithGuidance`, fetches mood logs within policy window from both legacy + v2
- Created `src/services/counselor-checkin-context/index.ts` — barrel as `counselorCheckInContextService`
- Modified `src/pages/CounselorDashboard.tsx` — risk → signal throughout, removed Critical Risks stat card, heading "Recent check-ins"
- Modified `src/pages/counselor/Students.tsx` — risk → signal throughout, inline `StudentRow`/`getSignalStyle`, signal-based filters
- Deleted `src/pages/counselor/RiskCenter.tsx` (route removed from App.tsx)
- Deleted `src/components/counselor/RiskCaseCard.tsx`, `StudentCard.tsx`, `FilterChip.tsx`

**E4 details:**
- Created `src/types/mood-v2.types.ts` — `MoodLogEntryDoc`, `MoodLogEntryRow`, `SleepQuality`, `ContextCategoryKey`
- Created `src/services/mood-v2/get/getMoodLogEntries.ts` — one-shot + real-time subscription for v2 entries
- Created `src/services/mood-v2/get/hasMoodEntryForDayKey.ts` — day-key existence check
- Created `src/services/mood-v2/post/createMoodLogEntry.ts` — write to v2 subcollection
- Created `src/services/mood-v2/index.ts` — barrel as `moodV2Service`
- Modified `src/services/mood/get/getMoodLogs.ts` — dual-source fetch + merge with `MergedMoodLog` interface and v2→legacy mapping

**E3 details:**
- Created `src/pages/student/DailySelfie.tsx` as a standalone route wrapping `EmotionDetection`.
- Added a "Daily Selfie" quick-action card to `StudentDashboard`.

**E5 details:**
- Created `src/types/user-settings.types.ts` and `src/services/user-settings/index.ts` for Firestore CRUD.
- Created `src/contexts/UserDaySettingsContext.tsx` to expose preferences globally.
- Implemented `src/pages/student/Settings.tsx` to handle student toggles.
- Wired `UserDaySettingsProvider` at root and added Settings link to `StudentLayout`.

**E6 details:**
- Rewrote `src/services/analytics/helpers.ts` to output `WeekSummaryInput` matching the mobile function exactly.
- Replaced direct OpenAI call in `fetchWeeklyNarrative.ts` with `httpsCallable(functions, 'generateWeeklySummaryAi')`.
- Simplified `WeeklyNarrative.tsx` to display the backend's plain-text summary instead of parsing JSON arrays.

### Phase F: Admin Placeholder Pages

| Item | Description | Effort |
|------|-------------|--------|
| **F1** | Admin Students (real page) | Medium |
| **F2** | Admin Resources (real page) | Medium |
| **F3** | Admin Analytics (real page) | Small |
| **F4** | Admin CounselorDetail | Small |
| **F5** | Admin StudentDetail | Small |
| **F6** | Admin ResourceDetail | Small |

---

## Key Architecture Notes

- **Services** follow the pattern: `src/services/{domain}/{verb}/{action}.ts` with a barrel `index.ts`
- **Types** live in `src/types/{domain}.types.ts`
- **Utils** live in `src/utils/` or `src/utils/analytics/`
- **Firebase config** is in `src/config/firebase.ts` (currently has Auth, Firestore, Storage; C1 will add RTDB)
- **Auth context** is `src/contexts/AuthContext.tsx` — use `useAuth()` hook
- **Routing** is `react-router-dom` v7 in `src/App.tsx`
- **Icons** use `lucide-react`
- **Styling** uses Aurora dark theme tokens defined in `src/index.css` — see workflow doc Section 0 for the full token table
