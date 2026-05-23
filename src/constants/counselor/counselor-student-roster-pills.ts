/**
 * Counselor home + directory roster chips — session consent only.
 * Matches mobile `counselor-student-roster-pills.ts`.
 */

export type CounselorStudentRosterPill = 'session_started' | 'no_session_yet'

export const COUNSELOR_ROSTER_PILL_LABEL: Record<CounselorStudentRosterPill, string> = {
  session_started: 'Guidance session',
  no_session_yet: 'No session yet',
}

export const COUNSELOR_ROSTER_PILL_SORT: Record<CounselorStudentRosterPill, number> = {
  session_started: 0,
  no_session_yet: 1,
}
