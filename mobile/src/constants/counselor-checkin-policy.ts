/**
 * Counselor-facing check-in policy (capstone / ethics framing).
 * Counselors see self-reported data only — not a clinical assessment.
 */

/** How many calendar days of mood_logs counselors may review when a student opts in. */
export const COUNSELOR_CHECKIN_WINDOW_DAYS = 7;

export function counselorCheckInWindowStart(): Date {
    const d = new Date();
    d.setDate(d.getDate() - COUNSELOR_CHECKIN_WINDOW_DAYS);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * What “share check-ins” exposes to guidance (high level, for UI copy).
 * Implementation: last N days of `mood_logs` — stress_level, energy_level, log_date,
 * optional dominant emotion from the emotions array. Notes / journal text are excluded
 * from counselor surfaces built on this policy.
 */
export const COUNSELOR_VISIBLE_CHECKIN_SUMMARY =
    'Only your self-reported stress and energy from recent check-ins, the time of each check-in, and a simple mood label if you logged one. Your private notes stay on your device and are not shown to guidance in Aurora.';
