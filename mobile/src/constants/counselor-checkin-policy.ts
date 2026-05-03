/**
 * Counselor-facing check-in policy (capstone / ethics framing).
 * Counselors see self-reported data only — not a clinical assessment.
 */

/** How many calendar days of mood data counselors review on student-facing surfaces. */
export const COUNSELOR_CHECKIN_WINDOW_DAYS = 7;

export function counselorCheckInWindowStart(): Date {
    const d = new Date();
    d.setDate(d.getDate() - COUNSELOR_CHECKIN_WINDOW_DAYS);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * What guidance sees for every student by default (student profile copy).
 * Special population (after session consent) unlocks full journal fields for that counselor.
 */
export const COUNSELOR_VISIBLE_CHECKIN_SUMMARY =
    'Counselors can see each check-in’s date, time, and mood label from recent history. Notes, sleep, meals, bath, and photos are not shown unless you are in that counselor’s special population (session request or accepting their proposed time).';
