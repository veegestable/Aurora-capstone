# Mobile Feature Parity — Progress Log

**Last updated:** April 16, 2026
**Parent workflow:** `.agent/workflows/mobile-feature-parity.md`
**Mode:** Ask Mode (read-only, copy-paste snippets)

---

## How to Resume

1. Open `.agent/workflows/mobile-feature-parity.md` for full context on rules, branding tokens, architecture, and remaining feature specs.
2. The next item to implement is **C1 (Online Presence / Green Dot)**.
3. Follow the same pattern used for A1–B4: read the mobile reference files, read the web files, provide complete copy-paste-ready snippets with exact file paths.

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

## Remaining Phases

### Phase C: Medium Priority (real-time + communication)

| Item | Description | Effort |
|------|-------------|--------|
| **C1** | Online presence (green dot) — Firebase RTDB `presence/{uid}` with `onDisconnect` | Medium |
| **C2** | Announcements system — admin CRUD + student-facing banner | Medium |
| **C3** | Audit logging — write on sensitive actions + admin log viewer | Medium |
| **C4** | OpenAI weekly analytics narrative | Small |
| **C5** | Counselor session history screen + route | Medium |

### Phase D: Low Priority (polish)

| Item | Description | Effort |
|------|-------------|--------|
| **D1** | Zen ambient audio playback (HTML5 Audio API) | Small |
| **D2** | Admin settings page (replace placeholder) | Small |

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
