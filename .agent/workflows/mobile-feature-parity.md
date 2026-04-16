---
description: Implementation guide for closing the mobile-to-web feature gap. Use in Ask Mode — provide copy-paste-ready snippets, not direct edits.
---

# Mobile Feature Parity — Web Implementation Guide

This workflow drives the implementation of features that exist in the mobile app but are missing or incomplete on the web. The AI assistant operates in **Ask Mode** (read-only) and provides **complete, copy-paste-ready code snippets** with exact file paths. The user applies all changes manually.

**Companion docs:**
- [aurora-design-system.md](.agent/workflows/aurora-design-system.md) — color tokens, component patterns, translation rules
- [web-refactor.md](.agent/workflows/web-refactor.md) — screen-level mapping and routing setup

---

## 0. Rules

### Mode

- **Ask Mode only.** Do not make direct edits.
- Provide complete snippets the user can copy-paste. Include the target file path above each snippet.
- Keep batches small and focused — one feature or sub-feature per response.
- Every variable declared must be used. No dead code, no placeholder TODOs.

### Branding

All UI must follow the Aurora dark theme defined in `src/index.css`:

| Token class | Value | Use for |
|---|---|---|
| `bg-aurora-bg` | `#0B0D30` | Page/layout backgrounds |
| `bg-aurora-card` | `#10143C` | Card surfaces |
| `border-aurora-border` | `rgba(255,255,255,0.08)` | Card and divider borders |
| `text-aurora-text-primary` | `#FFFFFF` | Primary text |
| `text-aurora-text-sec` | `#7B8EC8` | Secondary / descriptive text |
| `text-aurora-text-muted` | `#4B5693` | Muted / placeholder text |
| `text-aurora-blue` / `bg-aurora-blue` | `#2D6BFF` | Primary accent, links, active |
| `text-aurora-green` / `bg-aurora-green` | `#22C55E` | Success, approve |
| `text-aurora-red` / `bg-aurora-red` | `#EF4444` | Error, reject, destructive |
| `text-aurora-amber` / `bg-aurora-amber` | `#FEBD03` | Warnings, pending |
| `text-aurora-purple` / `bg-aurora-purple` | `#7C3AED` | Purple accent |

Pre-built utilities to prefer over hand-rolling: `btn-aurora`, `btn-aurora-secondary`, `btn-aurora-outline`, `card-aurora`, `gradient-aurora`, `text-gradient-aurora`, `text-aurora-subtitle`, `font-primary`.

Fonts: `font-heading` for headings, `font-body` for body text. Cards use `rounded-[14px] border border-aurora-border`. See `aurora-design-system.md` Section 9 for full mobile-to-Tailwind translation table.

### Architecture

- Firebase services live in `src/services/`. Reuse existing service modules. When a new service is needed, follow the pattern in `src/services/firebase-firestore.service.ts`.
- Hooks live in `src/hooks/`. Keep them thin wrappers around services.
- Types live in `src/types/`. Port from `mobile/src/types/` when missing.
- Global state uses React Context (`src/contexts/AuthContext.tsx`). Do not introduce Zustand.
- Routing uses `react-router-dom` v7 in `src/App.tsx`.
- Icons use `lucide-react`.

---

## 1. Feature Gaps — Ordered by Priority

### Phase A: Critical Fixes (broken functionality)

#### A1. Fix Counselor Messages Query

**Problem:** `src/pages/counselor/Messages.tsx` calls `getConversationsForStudent(user.id)` which queries `studentId == userId`. For a counselor, this returns nothing because the counselor is not a student.

**Mobile reference:** `mobile/app/(counselor)/messages.tsx` — queries conversations where the counselor is a participant (likely `counselorId == userId` or an array-contains on a participants field).

**Implementation steps:**
1. Read `mobile/app/(counselor)/messages.tsx` to confirm the Firestore query structure.
2. Read `src/services/messages/` to find `getConversationsForStudent` and understand the current query.
3. Add a new function `getConversationsForCounselor(counselorId)` to the messages service that queries `conversations` where `counselorId == counselorId`.
4. Update `src/pages/counselor/Messages.tsx` to call the new function.

**Files to touch:**
- `src/services/messages/` (add `getConversationsForCounselor`)
- `src/pages/counselor/Messages.tsx` (swap query call)

---

### Phase B: High Priority (core student + counselor features)

#### B1. Real AI Emotion Detection

**Problem:** `src/components/EmotionDetection.tsx` uses `mockEmotionAnalysis()` with random fake results.

**Mobile reference:** `mobile/src/components/EmotionDetection.tsx` — sends a photo via multipart POST to `EXPO_PUBLIC_EMOTION_API_URL/api/emotion/analyze-upload`.

**Implementation steps:**
1. Read the mobile `EmotionDetection.tsx` to understand the API request format (multipart/form-data with an image field) and response shape.
2. In the web `src/components/EmotionDetection.tsx`, replace the `mockEmotionAnalysis` call with a real `fetch` to the same API endpoint. Use `import.meta.env.VITE_EMOTION_API_URL` as the base URL.
3. Create a `FormData` object, append the captured image as a Blob, and POST it.
4. Parse the response and map it to the existing emotion score format.
5. Add `VITE_EMOTION_API_URL` to `.env.example` with a comment.

**Files to touch:**
- `src/components/EmotionDetection.tsx` (replace mock with real fetch)
- `.env.example` (add `VITE_EMOTION_API_URL`)

---

#### B2. Dynamic Student Dashboard Metrics

**Problem:** `src/pages/StudentDashboard.tsx` shows hardcoded streak ("7"), trend ("Stable"), and AI insight text.

**Mobile reference:** `mobile/src/pages/student/MoodLogScreen.tsx` and `mobile/src/utils/analytics/` — computes streak from consecutive daily logs, trend from mood score direction, and daily insight from stress/energy bands.

**Implementation steps:**
1. Read the mobile analytics utilities (`ethicsDailyAnalytics.ts`, `suddenMoodChange.ts`, `dateKeys.ts`) to understand the computation logic.
2. Create `src/utils/analytics/` with equivalent functions:
   - `computeStreak(moodLogs)` — count consecutive days with logs ending at today.
   - `computeTrend(moodLogs)` — compare average mood score of last 3 days vs prior 3 days, return "Improving" / "Stable" / "Declining".
   - `computeDailyInsight(latestLog)` — rule-based message from stress/energy/sleep values.
3. In `StudentDashboard.tsx`, call these functions with the mood logs already available from `useMoodCheckIn` or a new `useMoodLogs` hook, and replace the hardcoded values.

**Files to touch:**
- `src/utils/analytics/computeStreak.ts` (new)
- `src/utils/analytics/computeTrend.ts` (new)
- `src/utils/analytics/computeDailyInsight.ts` (new)
- `src/utils/analytics/index.ts` (barrel export)
- `src/pages/StudentDashboard.tsx` (replace hardcoded values)

---

#### B3. Session Request and Invite Flow

**Problem:** The web has a "Request Session" button with a TODO. No session modals, no Firestore integration, no session cards in messages.

**Mobile reference:**
- `mobile/src/services/firebase-firestore.service.ts` — session CRUD (create, update, get by student/counselor)
- `mobile/src/components/student/` — session request modal
- `mobile/src/components/counselor/` — session invite/accept modal, session cards

**Implementation steps:**
1. Read the mobile session-related Firestore functions to understand the `sessions` collection schema (fields: studentId, counselorId, status, requestedAt, scheduledAt, notes, etc.).
2. Port session types to `src/types/session.types.ts`.
3. Create `src/services/sessions/` with functions: `createSessionRequest`, `getSessionsForStudent`, `getSessionsForCounselor`, `updateSessionStatus`.
4. Build `src/components/sessions/SessionRequestModal.tsx` — student fills in preferred time + notes, submits to Firestore.
5. Build `src/components/sessions/SessionCard.tsx` — displays session status in messages or dashboard.
6. Wire the "Request Session" button in `StudentDashboard.tsx` to open the modal.
7. Add a route or section in the counselor dashboard to show incoming session requests.

**UI:** Follow `aurora-design-system.md` Section 6 (Bottom Sheet Modals → centered overlay on web). Use `card-aurora` for session cards, `btn-aurora` for submit, status badges per the design system's Status Badges pattern.

**Files to touch:**
- `src/types/session.types.ts` (new)
- `src/services/sessions/createSessionRequest.ts` (new)
- `src/services/sessions/getSessionsForStudent.ts` (new)
- `src/services/sessions/getSessionsForCounselor.ts` (new)
- `src/services/sessions/updateSessionStatus.ts` (new)
- `src/services/sessions/index.ts` (barrel)
- `src/components/sessions/SessionRequestModal.tsx` (new)
- `src/components/sessions/SessionCard.tsx` (new)
- `src/pages/StudentDashboard.tsx` (wire modal)
- `src/pages/CounselorDashboard.tsx` (show requests)

---

#### B4. Counselor Dashboard Dynamic Stats

**Problem:** `src/pages/CounselorDashboard.tsx` has hardcoded "New Messages" (3) and "Pending Follow-ups" (8).

**Mobile reference:** `mobile/app/(counselor)/index.tsx` — computes real counts from Firestore queries on students, mood logs, and sessions.

**Implementation steps:**
1. Read the mobile counselor home screen to identify each metric and its data source.
2. Replace hardcoded values in `CounselorDashboard.tsx` with real Firestore queries:
   - Active student count from `counselorService.getStudents`.
   - Unread message count from conversations query.
   - At-risk student count derived from recent mood logs (stress >= 8 or energy <= 2).
   - Pending session requests from sessions collection.
3. Use existing services where possible; add new ones only if needed.

**Files to touch:**
- `src/pages/CounselorDashboard.tsx` (replace hardcoded metrics)
- Possibly `src/services/sessions/` (if not yet created from B3)

---

### Phase C: Medium Priority (real-time + communication)

#### C1. Online Presence (Green Dot)

**Problem:** No presence system on web.

**Mobile reference:** `mobile/src/services/firebase-presence.service.ts` — uses Firebase Realtime Database at `presence/{uid}/online` with `onDisconnect` to auto-set offline.

**Implementation steps:**
1. Read the mobile presence service to understand the RTDB structure.
2. Add Firebase Realtime Database initialization to `src/config/firebase.ts` (import `getDatabase`).
3. Create `src/services/presence.service.ts`:
   - `setOnline(uid)` — writes `{ online: true, lastSeen: serverTimestamp }` to `presence/{uid}`, sets `onDisconnect` to `{ online: false, lastSeen: serverTimestamp }`.
   - `subscribeToPresence(uids, callback)` — listens to multiple presence nodes.
4. Create `src/hooks/usePresence.ts` — calls `setOnline` on mount (in `AuthContext` or a top-level provider), cleans up on unmount.
5. Create `src/hooks/usePeerPresence.ts` — subscribes to a list of user IDs, returns a `Map<string, boolean>`.
6. Add a green dot indicator to avatar components in messages and student lists.

**Environment:** Requires `VITE_FIREBASE_DATABASE_URL` in `.env`.

**Files to touch:**
- `src/config/firebase.ts` (add RTDB init)
- `src/services/presence.service.ts` (new)
- `src/hooks/usePresence.ts` (new)
- `src/hooks/usePeerPresence.ts` (new)
- `.env.example` (add `VITE_FIREBASE_DATABASE_URL`)
- Avatar components in messages / student list (add green dot)

---

#### C2. Announcements System

**Problem:** Admin announcements page is a placeholder. No student-facing display. No announcements service.

**Mobile reference:**
- `mobile/src/services/announcements.service.ts` — Firestore `announcements` collection, queries by `targetRole`.
- `mobile/src/components/announcements/` — carousel display.

**Implementation steps:**
1. Read the mobile service and components to understand the schema (`title`, `body`, `imageUrl`, `targetRole`, `createdAt`, `active`).
2. Port types to `src/types/announcement.types.ts`.
3. Create `src/services/announcements/` with `getAnnouncements(role)`, `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`.
4. Replace the `AdminPlaceholder` in `src/pages/admin/Announcements.tsx` with a real CRUD interface (list + create/edit form).
5. Create `src/components/announcements/AnnouncementBanner.tsx` for student-facing display.
6. Add the banner to `StudentDashboard.tsx`.

**Files to touch:**
- `src/types/announcement.types.ts` (new)
- `src/services/announcements/` (new, multiple files)
- `src/pages/admin/Announcements.tsx` (replace placeholder)
- `src/components/announcements/AnnouncementBanner.tsx` (new)
- `src/pages/StudentDashboard.tsx` (add banner)

---

#### C3. Audit Logging (Write + Read)

**Problem:** No audit log writing on web actions. Admin viewer is a placeholder.

**Mobile reference:**
- `mobile/src/services/audit-logs.service.ts` — writes to `audit_logs` collection.
- `mobile/app/(admin)/audit-logs.tsx` — reads and displays entries.

**Implementation steps:**
1. Read the mobile audit log service to understand the document schema (`action`, `userId`, `targetId`, `details`, `timestamp`, `ip`).
2. Port types to `src/types/audit.types.ts`.
3. Create `src/services/audit-logs/` with `writeAuditLog(entry)` and `getAuditLogs(filters)`.
4. Add audit log writes to sensitive actions: messaging send, session status changes, counselor approval/rejection.
5. Replace the `AdminPlaceholder` in `src/pages/admin/AuditLogs.tsx` with a real log viewer (table with filters).

**Files to touch:**
- `src/types/audit.types.ts` (new)
- `src/services/audit-logs/` (new)
- `src/pages/admin/AuditLogs.tsx` (replace placeholder)
- `src/pages/counselor/Messages.tsx` (add audit writes on send)
- `src/pages/admin/Counselors.tsx` (add audit writes on approve/reject)

---

#### C4. OpenAI Weekly Analytics Narrative

**Problem:** Web analytics show charts but no AI-generated weekly summary.

**Mobile reference:** `mobile/src/services/weeklyAnalyticsAi.service.ts` — posts mood data to OpenAI `chat/completions`.

**Implementation steps:**
1. Read the mobile service to understand the prompt template and data format sent to OpenAI.
2. Create `src/services/analytics/weeklyNarrative.service.ts` — accepts a week of mood logs, builds the same prompt, calls the OpenAI API with `VITE_OPENAI_API_KEY`.
3. Create a `src/components/analytics/WeeklyNarrative.tsx` component that fetches and displays the narrative.
4. Integrate into `src/components/Analytics.tsx` as an optional section (with loading and error states).

**Security note:** Calling OpenAI directly from the browser exposes the API key. Consider whether a backend proxy is needed. The mobile app does the same client-side call, so match that pattern for now and flag it as a future improvement.

**Files to touch:**
- `src/services/analytics/weeklyNarrative.service.ts` (new)
- `src/components/analytics/WeeklyNarrative.tsx` (new)
- `src/components/Analytics.tsx` (integrate narrative section)
- `.env.example` (add `VITE_OPENAI_API_KEY`)

---

#### C5. Counselor Session History Screen

**Problem:** No session history screen on web.

**Mobile reference:** `mobile/app/(counselor)/session-history.tsx` — search, status filters, attendance tracking.

**Implementation steps:**
1. Read the mobile screen to understand layout and Firestore queries.
2. Create `src/pages/counselor/SessionHistory.tsx` with:
   - Search by student name.
   - Filter chips for status (all, completed, cancelled, no-show).
   - Session cards with date, student, status badge, attendance.
3. Add route in `src/App.tsx` under the counselor layout: `/counselor/session-history`.
4. Add a nav link in `src/layouts/CounselorLayout.tsx`.

**Files to touch:**
- `src/pages/counselor/SessionHistory.tsx` (new)
- `src/App.tsx` (add route)
- `src/layouts/CounselorLayout.tsx` (add nav item)

---

### Phase D: Low Priority (polish + nice-to-have)

#### D1. Zen Ambient Audio Playback

**Problem:** Web resources page has no audio playback.

**Mobile reference:** `mobile/src/services/zen-sounds.service.ts` — plays MP3 files for Meditation, Focus, Sleep categories.

**Implementation steps:**
1. Add audio files to `public/sounds/` (or host them externally / in Firebase Storage).
2. Create `src/services/zenSounds.service.ts` using the HTML5 `Audio` API — `play`, `pause`, `setVolume`, `getCurrentTrack`.
3. Build `src/components/resources/AmbientPlayer.tsx` — play/pause button, volume slider, track selector.
4. Integrate into `src/pages/student/Resources.tsx`.

**Files to touch:**
- `public/sounds/` (audio assets)
- `src/services/zenSounds.service.ts` (new)
- `src/components/resources/AmbientPlayer.tsx` (new)
- `src/pages/student/Resources.tsx` (integrate player)

---

#### D2. Admin Settings (Sign Out + Account Info)

**Problem:** `src/pages/admin/Settings.tsx` is a placeholder.

**Mobile reference:** `mobile/app/(admin)/(tabs)/settings.tsx` — shows account info and sign-out.

**Implementation steps:**
1. Replace the `AdminPlaceholder` with a simple settings page showing the admin's email, role, and a sign-out button.
2. Reuse `useAuth` from `AuthContext`.

**Files to touch:**
- `src/pages/admin/Settings.tsx` (replace placeholder)

---

## 2. Environment Variables Checklist

These env vars are needed for full feature parity. Add to `.env` and `.env.example`:

```
# Existing (Firebase)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# New — required for feature parity
VITE_FIREBASE_DATABASE_URL=        # Firebase RTDB (online presence)
VITE_EMOTION_API_URL=              # AI emotion detection endpoint
VITE_OPENAI_API_KEY=               # OpenAI weekly narrative (client-side — flag for future proxy)
```

---

## 3. Firestore Collections Reference

Collections used across features (verify rules allow web client access):

| Collection | Used by | Subcollections |
|---|---|---|
| `users` | Auth, profiles, student/counselor queries | — |
| `mood_logs` | Mood check-in, analytics, dashboard, risk | — |
| `conversations` | Messaging (student + counselor) | `messages` |
| `sessions` | Session requests, history, dashboard | — |
| `announcements` | Student home, admin CRUD | — |
| `audit_logs` | Admin viewer, action logging | — |
| `schedules` | Student schedule manager | — |
| `notifications` | Notification panel | — |
| `counselor_notes` | Counselor student detail | — |

---

## 4. Quick Summary

| Phase | Gap | Effort | Status |
|---|---|---|---|
| A1 | Counselor messages query fix | Small | Not started |
| B1 | Real AI emotion detection | Small | Not started |
| B2 | Dynamic dashboard metrics | Medium | Not started |
| B3 | Session request/invite flow | Large | Not started |
| B4 | Counselor dashboard dynamic stats | Small | Not started |
| C1 | Online presence (green dot) | Medium | Not started |
| C2 | Announcements system | Medium | Not started |
| C3 | Audit logging (write + read) | Medium | Not started |
| C4 | OpenAI weekly narrative | Small | Not started |
| C5 | Counselor session history | Medium | Not started |
| D1 | Zen ambient audio | Small | Not started |
| D2 | Admin settings | Small | Not started |
