import type { CounselorApprovalStatus } from "../services/firebase-auth.service";

/** Read snake_case or camelCase from Firestore. */
export function readCounselorApprovalRaw(
  c: Record<string, unknown>,
): string | undefined {
  const v = c.approval_status ?? c.approvalStatus;
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  return s === "" ? undefined : s;
}

/** True only for counselors who still need an admin decision (explicit pending). */
export function isCounselorPendingApproval(
  c: Record<string, unknown>,
): boolean {
  return readCounselorApprovalRaw(c) === "pending";
}

/**
 * Badge label: unset / unknown → treat as approved (matches app access: legacy
 * counselors without a field are not blocked).
 */
export function counselorApprovalBadgeStatus(
  c: Record<string, unknown>,
): CounselorApprovalStatus {
  const s = readCounselorApprovalRaw(c);
  if (s === "pending" || s === "rejected" || s === "approved") return s;
  return "approved";
}

/**
 * Counselors students may message or request sessions with.
 * Strict policy:
 * - admin-approved counselors only
 * - verified email only
 * Supports legacy values where `approval_status` can be boolean true/"true".
 */
export function isCounselorSelectableByStudent(
  c: Record<string, unknown>,
): boolean {
  const approvalRaw = c.approval_status ?? c.approvalStatus;
  const approvalStr = readCounselorApprovalRaw(c);
  const isApproved =
    approvalRaw === true ||
    approvalStr === "approved" ||
    String(approvalRaw ?? "").trim().toLowerCase() === "true";
  if (!isApproved) return false;

  const ev = c.email_verified ?? c.emailVerified;
  return ev === true;
}
