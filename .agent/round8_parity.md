# Round 8 Parity

## Objective

This document is the **8th Round of Parity** for the Aurora web app. It follows [Round 7 Parity](round7_parity.md) and ports **multi-college data model + UI, auth error mapping, sign-out confirmation modal, and announcements audience refinement** from the mobile commits listed below.

Use this file as the source of truth for **what to implement** and **where to change code**.

---

## Source commits (mobile)

| Hash | Summary |
|------|---------|
| `b60341c` | Added college, programs constants; signup college/program pickers; counselor profile college display; auth backfill helpers; announcements audience refine |
| `571dc79` | Merge — same as above |
| `da0d80a` | Fix typecheck (Firestore service override) |
| `5ac00fd` | Merge — same as above |
| `3282a95` | Fix modal & logic — Firestore `college_code` on conversations/sessions; college shift request for counselors; announcements `viewerUserId`; SVG asset cleanup; counselor students filtered by college |
| `d6b4ee5` | Handle error login — `firebase-auth-errors.ts` user-facing auth error mapper |
| `6d863e2` | Normalized college-programs-iit casing |
| `c8c5df7` | Sign-out confirmation modal — `SignOutConfirmModal` component; used in student profile + counselor profile |

---

## Scope by feature

### 1. College & program constants

- **New file:** `src/constants/colleges.ts` — canonical `CollegeCode` type, `COLLEGES` array, `isCollegeCode()`, `getCollegeName()`, `resolveCollegeCodeFromUserData()`.
- **New file:** `src/constants/college-programs-iit.ts` — `IIT_COLLEGE_PROGRAMS` map, `getProgramsForCollege()`, `isProgramInCollege()`, `inferCollegeCodeFromProgramLabel()`.
- **Modified:** `src/constants/student/ccs-student-programs.ts` (if exists) — update `matchLegacyDepartmentToProgramValue()` to accept `collegeOrLegacyDepartment` param instead of `department`.
- Port directly from mobile equivalents, adapting imports only.

### 2. Auth types & signup: `college_code` + `program`

- **Modified:** [`src/services/firebase-auth/types.ts`](../src/services/firebase-auth/types.ts) — add `college_code` and `program` to `SignUpData` and `UserProfile`.
- **Modified:** [`src/services/firebase-auth/auth/signUp.ts`](../src/services/firebase-auth/auth/signUp.ts) — persist `college_code` and `program` in the Firestore doc when provided. Remove `as any`.
- **Modified:** [`src/types/user.types.ts`](../src/types/user.types.ts) — add `college_code?: string`, `college_shift_pending?: boolean` to `User`.
- **Modified:** [`src/contexts/AuthContext.tsx`](../src/contexts/AuthContext.tsx):
  - Widen `signUp` to accept `collegeCode` + `program` params.
  - Expose `refreshUserProfile()` method.
  - Wire `college_code` in `convertUserProfile`.

### 3. Login page: college + program pickers (signup only)

- **Modified:** [`src/pages/Login.tsx`](../src/pages/Login.tsx):
  - Add `collegeCode` and `program` to `formData` state.
  - Show college `<select>` (or styled picker) after role is chosen during signup.
  - Show program `<select>` filtered by selected college (students only).
  - Validation: both required before submit; clear on role/college change.
  - Pass to `signUp()`.

### 4. Firebase auth error mapper (user-facing messages)

- **New file:** `src/utils/firebase-auth-errors.ts` — port `toUserFacingEmailAuthError()` from mobile; maps Firebase error codes to human-readable messages.
- **Modified:** [`src/services/firebase-auth/auth/signIn.ts`](../src/services/firebase-auth/auth/signIn.ts) — wrap thrown errors with `toUserFacingEmailAuthError()`.
- **Modified:** [`src/pages/Login.tsx`](../src/pages/Login.tsx) — error messages now show user-friendly text instead of raw Firebase SDK jargon.

### 5. Sign-out confirmation modal

- **New file:** `src/components/common/SignOutConfirmModal.tsx` — web-adapted modal: dark card, "No, stay" / "Yes, leave" buttons, loading spinner on leave, LogOut icon accent.
- **Modified:** All **6** existing sign-out call sites:
  - [`src/pages/Settings.tsx`](../src/pages/Settings.tsx) — replace `window.confirm()` with `SignOutConfirmModal`.
  - [`src/pages/student/Profile.tsx`](../src/pages/student/Profile.tsx) — replace `window.confirm()` with `SignOutConfirmModal`.
  - [`src/pages/counselor/Profile.tsx`](../src/pages/counselor/Profile.tsx) — replace `window.confirm()` with `SignOutConfirmModal`.
  - [`src/layouts/StudentLayout.tsx`](../src/layouts/StudentLayout.tsx) — header sign-out button (no confirm at all currently).
  - [`src/layouts/CounselorLayout.tsx`](../src/layouts/CounselorLayout.tsx) — header sign-out button (no confirm at all currently).
  - [`src/layouts/AdminLayout.tsx`](../src/layouts/AdminLayout.tsx) — header sign-out button (no confirm at all currently).
  - [`src/pages/PendingCounselor.tsx`](../src/pages/PendingCounselor.tsx) — sign-out button (no confirm currently).

### 6. Profile / Settings: college display + college shift request

- **Modified:** [`src/pages/Settings.tsx`](../src/pages/Settings.tsx) or role-specific settings route:
  - Display current college (resolved via `resolveCollegeCodeFromUserData`).
  - "Request college / program change" action (opens a modal/form).
  - Show "College change pending review" banner when `college_shift_pending` is true.
- **Modified:** [`src/services/user-settings/`](../src/services/user-settings/) — add `requestCollegeShift()` function that writes to `college_shift_requests` collection (mirror mobile's `firestoreService.requestCollegeShift`).

### 7. Announcements audience filter refinement

- **Modified:** [`src/services/announcements/helpers.ts`](../src/services/announcements/helpers.ts):
  - Replace simple `targetRole` audience check with the `announcementMatchesReader()` logic from mobile — supports `visibility` field (`all`, `counselors_only`, `students_one_college`, `colleges_cross`), `collegeCodes` array, admin bypass, own-author bypass.
  - Accept `viewerUserId` option.
  - Update `mapAnnouncementsForRole()` to use the new matcher.
- **Modified:** announcement subscriber/getter call sites to pass `viewerUserId`.

### 8. Conversations + sessions: `college_code` tagging

- **Modified:** conversation service files (e.g., `getConversationsForStudent.ts`, `getConversationsForCounselor.ts`, `startConversation` / `sendMessage`) — when creating or loading conversations, resolve and write `college_code` on the doc.
- **Modified:** session service files — similar tagging on session docs.
- This mirrors mobile's `resolveConversationCollegeCode()` and `stampParticipantConversationsWithCollege()`.

> [!NOTE]
> Items 7 and 8 are **data-model alignment** items. They ensure Firestore rules work correctly once the rules are deployed that enforce college scoping. Without these, web users would see empty conversation/session lists or permission errors once the updated Firestore rules go live.

---

## Suggested implementation order

1. **Constants** — `colleges.ts` + `college-programs-iit.ts` (zero UI, shared dependency).
2. **Auth types & signup** — types, service, context wiring.
3. **Login page** — college/program pickers.
4. **Auth error mapper** — util + signIn integration.
5. **Sign-out confirm modal** — component + settings integration.
6. **Profile / college shift** — settings display + request action.
7. **Announcements** — audience filter refinement.
8. **Conversations & sessions college tagging** — service layer.
9. **Final cleanup** — remove orphaned code, unused imports, stale `any` casts.

---

## Coding standards

- Same as Rounds 5–7: **clean up** orphaned/deprecated code when touching areas; avoid unused variables. If you declare it, use it — if you don't use it, don't declare it.
- **`services/`** structure: `get/`, `post/`, `put/`, `delete/`, `index.ts` barrel, `types.ts` as in prior rounds.
- Branding: follow [Aurora Design System](workflows/aurora-design-system.md) — dark AURORA palette, card/badge patterns, spacing.
- **No new `any`**: use `unknown` or define a proper interface. Refactor existing `any` when modifying legacy code in touched files.
- **Modularity**: keep components focused and reusable. Extract shared logic into helpers/hooks.

---

## Workflows (required)

- **[web-refactor.md](workflows/web-refactor.md):** Vite + React 19, `react-router-dom` v7, Tailwind v4 + tokens in [`src/index.css`](../src/index.css), Context (not Zustand), `lucide-react`, Firebase. Services: `src/services/{feature}/{verb}/…` + barrel `index.ts`.
- **[aurora-design-system.md](workflows/aurora-design-system.md):** Dark AURORA tokens; layout may differ on large viewports but **visual parity** with mobile for colors, typography hierarchy, and component styling.
- **[mobile-feature-parity.md](workflows/mobile-feature-parity.md):** Snippet mode — provide copy-paste-ready code, not direct file edits.
- **Progress tracker:** **[round-8-progress.md](workflows/round-8-progress.md)** — update after each batch.

---

## Relation to Round 7

[Round 7 Parity](round7_parity.md) closed the Journal Analytics gaps. **Round 8** does not reopen analytics; it addresses the **multi-college data model, auth UX improvements, and sign-out modal** that were shipped on mobile between Rounds 7 and now. Use Round 7 for context; use Round 8 for this sprint's checklist.
