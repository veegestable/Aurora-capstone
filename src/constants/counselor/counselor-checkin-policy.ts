/**
 * Counselor-facing check-in policy (capstone / ethics framing).
 * Counselors see self-reported data only — not a clinical assessment.
 */

/** How many calendar days of mood_logs counselors may review when a student opts in. */
const COUNSELOR_CHECKIN_WINDOW_DAYS = 3

export function counselorCheckInWindowStart(): Date {
  const d = new Date()
  d.setDate(d.getDate() - COUNSELOR_CHECKIN_WINDOW_DAYS)
  d.setHours(0, 0, 0, 0)
  return d
}