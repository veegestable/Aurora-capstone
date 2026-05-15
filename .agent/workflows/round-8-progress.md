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

### [ ] Batch 1 — College & program constants

- Covers [round8_parity.md §1](../round8_parity.md): port `colleges.ts` + `college-programs-iit.ts` from mobile. Zero UI, shared dependency for all subsequent batches.
- **Touched:**
- **Notes:**

### [ ] Batch 2 — Auth types, signup service, context wiring

- Covers [round8_parity.md §2](../round8_parity.md): add `college_code` + `program` to `SignUpData`, `UserProfile`, `User`; widen `signUp()` in `AuthContext`; expose `refreshUserProfile()`.
- **Touched:**
- **Notes:**

### [ ] Batch 3 — Login page: college + program pickers

- Covers [round8_parity.md §3](../round8_parity.md): add college/program `<select>` fields to the signup form; validation; clear on role/college change.
- **Touched:**
- **Notes:**

### [ ] Batch 4 — Firebase auth error mapper

- Covers [round8_parity.md §4](../round8_parity.md): new `firebase-auth-errors.ts` utility; integrate in `signIn.ts` so login errors show user-facing copy.
- **Touched:**
- **Notes:**

### [ ] Batch 5 — Sign-out confirmation modal

- Covers [round8_parity.md §5](../round8_parity.md): new `SignOutConfirmModal.tsx` component; replace `window.confirm()` or bare `signOut()` at all **7** call sites: `Settings.tsx`, `student/Profile.tsx`, `counselor/Profile.tsx`, `StudentLayout.tsx`, `CounselorLayout.tsx`, `AdminLayout.tsx`, `PendingCounselor.tsx`.
- **Touched:**
- **Notes:**

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
