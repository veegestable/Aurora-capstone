---
description: Round 8 web parity — batch progress tracker. Update after each batch.
---

# Round 8 Parity — Progress Tracker

Source plan: [round8_parity.md](../round8_parity.md)

Standards: [aurora-design-system.md](aurora-design-system.md), [web-refactor.md](web-refactor.md), [mobile-feature-parity.md](mobile-feature-parity.md)

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

### [x] Batch 1 — College & program constants

- Covers [round8_parity.md §1](../round8_parity.md): port `colleges.ts` + `college-programs-iit.ts` from mobile. Zero UI, shared dependency for all subsequent batches.
- **Touched:** `src/constants/colleges.ts` [NEW], `src/constants/college-programs-iit.ts` [NEW]
- **Notes:** 1:1 port from mobile — pure data + utility, zero RN deps. 7 colleges, 70+ programs.

### [x] Batch 2 — Auth types, signup service, context wiring

- Covers [round8_parity.md §2](../round8_parity.md): add `college_code` + `program` to `SignUpData`, `UserProfile`, `User`; widen `signUp()` in `AuthContext`; expose `refreshUserProfile()`.
- **Touched:** `src/services/firebase-auth/types.ts`, `src/services/firebase-auth/auth/signUp.ts`, `src/types/user.types.ts`, `src/contexts/AuthContext.tsx`
- **Notes:** Added `CollegeShiftRequest` interface, college/program validation in signUp, `refreshUserProfile()` via useCallback. Replaced `any` with `unknown` in signUp catch.

### [x] Batch 3 — Login page: college + program pickers

- Covers [round8_parity.md §3](../round8_parity.md): add college/program `<select>` fields to the signup form; validation; clear on role/college change.
- **Touched:** `src/pages/Login.tsx`
- **Notes:** Added `collegeCode`+`program` to formData; college `<select>` always shown in signup, program `<select>` for students only after college picked; dependent field clearing on role/college change; counselor approval notice.

### [x] Batch 4 — Firebase auth error mapper

- Covers [round8_parity.md §4](../round8_parity.md): new `firebase-auth-errors.ts` utility; integrate in `signIn.ts` so login errors show user-facing copy.
- **Touched:** `src/utils/firebase-auth-errors.ts` [NEW], `src/services/firebase-auth/auth/signIn.ts`
- **Notes:** 1:1 port of error mapper from mobile; 14 error codes mapped. Replaced `any` with `unknown` in signIn catch. Login.tsx needs no change — already displays `err.message`.

### [x] Batch 5 — Sign-out confirmation modal

- Covers [round8_parity.md §5](../round8_parity.md): build `SignOutConfirmModal.tsx`; replace `window.confirm()` / bare `signOut()` across all 7 call sites.
- **Touched:** `src/components/common/SignOutConfirmModal.tsx` [NEW], `src/pages/Settings.tsx`, `src/pages/student/Profile.tsx`, `src/pages/counselor/Profile.tsx`, `src/layouts/StudentLayout.tsx`, `src/layouts/CounselorLayout.tsx`, `src/layouts/AdminLayout.tsx`, `src/pages/PendingCounselor.tsx`
- **Notes:** Themed dark card with LogOut icon, purple "No stay" / red "Yes leave" pill buttons, Loader2 spinner. All 7 sign-out sites now use the modal.

### [ ] Batch 6 — Profile: college display + college shift request

- Covers [round8_parity.md §6](../round8_parity.md): display resolved college on profile/settings; "Request college change" action; pending banner; `requestCollegeShift()` service.
- **Touched:**
- **Notes:**

### [ ] Batch 7 — Announcements audience filter refinement

- Covers [round8_parity.md §7](../round8_parity.md): replace simple `targetRole` check with `announcementMatchesReader()` supporting `visibility`, `collegeCodes`, admin/author bypass, `viewerUserId`.
- **Touched:**
- **Notes:**

### [ ] Batch 8 — Conversations & sessions: `college_code` tagging

- Covers [round8_parity.md §8](../round8_parity.md): resolve + write `college_code` on conversation/session docs; stamp helpers; filter by active college where mobile does.
- **Touched:**
- **Notes:**

### [ ] Batch 9 — Final sweep: cleanup + orphan removal

- Covers [round8_parity.md §9](../round8_parity.md): remove orphaned code; dead imports; stale `any` casts in touched files; unused variables.
- **Touched:**
- **Notes:**

---

## Cleanup log

| Date | Item | Reason |
|------|------|--------|
| | | |

---

## Open questions

- [x] Does the web currently have `ccs-student-programs.ts`? **No.** `college-programs-iit.ts` will be the first and only source of college/program data.
- [x] Confirm Firestore rules deployment timing — **Rules are already live** (mobile is deployed and working).
- [x] Where are sign-out buttons? **7 call sites:** `Settings.tsx`, `student/Profile.tsx`, `counselor/Profile.tsx`, `StudentLayout.tsx` header, `CounselorLayout.tsx` header, `AdminLayout.tsx` header, `PendingCounselor.tsx`. All need the confirmation modal.
