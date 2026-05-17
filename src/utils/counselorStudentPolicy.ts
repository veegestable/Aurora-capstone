import {
  isCollegeCode,
  resolveCollegeCodeFromUserData,
  type CollegeCode,
} from '../constants/colleges'
import { isCounselorSelectableByStudent } from './counselorApprovalForAdmin'

export function sameResolvedCollege(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  const ca = resolveCollegeCodeFromUserData(a ?? null)
  const cb = resolveCollegeCodeFromUserData(b ?? null)
  return !!ca && !!cb && ca === cb
}

/** Approved + email_verified + same college as the student (when student college is known). */
export function counselorEligibleForStudent(
  counselor: Record<string, unknown>,
  studentCollege: CollegeCode | '',
): boolean {
  if (!isCounselorSelectableByStudent(counselor)) return false
  if (!studentCollege || !isCollegeCode(studentCollege)) return false
  return sameResolvedCollege(counselor, { college_code: studentCollege })
}

export function conversationCollegeTag(data: Record<string, unknown>): string {
  const raw = data.college_code
  return typeof raw === 'string' ? raw.trim() : ''
}

/** Verified student in the counselor's active college unit (mobile directory rules). */
export function studentEligibleForCounselorInbox(
  student: Record<string, unknown>,
  activeCollege: CollegeCode | '',
): boolean {
  const role = String(student.role ?? '').trim().toLowerCase()
  if (role !== 'student') return false
  if (student.email_verified !== true) return false
  if (!activeCollege || !isCollegeCode(activeCollege)) return false
  return sameResolvedCollege(student, { college_code: activeCollege })
}

/** Inbox shows only threads tagged with the student's current college (mobile parity). */
export function conversationMatchesActiveCollege(
  data: Record<string, unknown>,
  activeCollege: string | undefined | null,
): boolean {
  const active = (activeCollege ?? '').trim()
  if (!active || !isCollegeCode(active)) return true
  const tag = conversationCollegeTag(data)
  if (!tag) return false
  return tag === active
}
