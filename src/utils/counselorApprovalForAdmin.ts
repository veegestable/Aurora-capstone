/** Read snake_case or camelCase from Firestore. */
export function readCounselorApprovalRaw(
  c: Record<string, unknown>,
): string | undefined {
  const v = c.approval_status ?? c.approvalStatus
  if (v == null) return undefined
  const s = String(v).trim().toLowerCase()
  return s === '' ? undefined : s
}

/**
 * Counselors students may message or request sessions with.
 * Admin-approved and email_verified only (mobile parity).
 */
export function isCounselorSelectableByStudent(
  c: Record<string, unknown>,
): boolean {
  const approvalRaw = c.approval_status ?? c.approvalStatus
  const approvalStr = readCounselorApprovalRaw(c)
  const isApproved =
    approvalRaw === true ||
    approvalStr === 'approved' ||
    String(approvalRaw ?? '').trim().toLowerCase() === 'true'
  if (!isApproved) return false

  const ev = c.email_verified ?? c.emailVerified
  return ev === true
}
