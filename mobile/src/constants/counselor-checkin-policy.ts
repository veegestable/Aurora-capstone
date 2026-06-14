/**
 * Counselor-facing check-in policy (capstone / ethics framing).
 * Counselors see self-reported data only — not a clinical assessment.
 */

/** Baseline / roster: recent mood signal window (date, time, mood only). */
export const COUNSELOR_CHECKIN_WINDOW_DAYS = 7;

/** Special population: full journal + 7/30-day analytics (matches student analytics). */
export const COUNSELOR_JOURNAL_ANALYTICS_WINDOW_DAYS = 30;

export function counselorCheckInWindowStart(
  windowDays: number = COUNSELOR_CHECKIN_WINDOW_DAYS,
): Date {
  const d = new Date();
  d.setDate(d.getDate() - windowDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function counselorJournalAnalyticsWindowStart(): Date {
  return counselorCheckInWindowStart(COUNSELOR_JOURNAL_ANALYTICS_WINDOW_DAYS);
}

/**
 * What guidance sees for every student by default (student profile copy).
 * Special population (after session consent) unlocks full journal fields for that counselor.
 */
export const COUNSELOR_VISIBLE_CHECKIN_SUMMARY =
    'Counselors can see each check-in’s date, time, and mood label from recent history. Pattern badges (elevated stress, low energy) are derived from daily-averaged self-reports for roster triage and are not clinical assessments. Notes, sleep, meals, bath, and photos are not shown unless you are in that counselor’s special population (session request or accepting their proposed time).';
