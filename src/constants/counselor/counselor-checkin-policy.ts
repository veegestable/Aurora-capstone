/**
 * Counselor-facing check-in policy (capstone / ethics framing).
 * Counselors see self-reported data only — not a clinical assessment.
 */

/** Baseline / roster mood signal window. */
export const COUNSELOR_CHECKIN_WINDOW_DAYS = 7

/** Special population: journal + analytics (7/30-day charts). */
export const COUNSELOR_JOURNAL_ANALYTICS_WINDOW_DAYS = 30

export function counselorCheckInWindowStart(
  windowDays: number = COUNSELOR_CHECKIN_WINDOW_DAYS,
): Date {
  const d = new Date()
  d.setDate(d.getDate() - windowDays)
  d.setHours(0, 0, 0, 0)
  return d
}