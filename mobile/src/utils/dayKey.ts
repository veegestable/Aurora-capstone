/**
 * Day boundaries for Aurora mood logs.
 *
 * **Canonical bucketing (Journal, Analytics, streaks, counselor summaries):**
 * `calendarDayKeyLocal` — device-local calendar date `YYYY-MM-DD` from each log's
 * `log_date` instant. Matches what users see on the calendar grid.
 *
 * **Legacy / optional:** `getDayKey(timestamp, resetHour, timezone)` shifts "the day"
 * before `resetHour` in the given IANA timezone (wake-day semantics). It is no longer
 * used for student-facing aggregates; `userSettings.dayResetHour` may remain in
 * Firestore for backwards compatibility until removed from settings UI.
 *
 * ---
 * **Known limitations (professional disclosure):**
 *
 * - **Travel / TZ changes:** Keys use the device's local calendar at parse time.
 *   If the user flies across zones or changes OS timezone, the same UTC instant can
 *   appear under different calendar days before vs after the change.
 * - **DST jumps:** Midnight exists once per calendar day; ambiguous/skipped hours use
 *   JS Date behavior (usually acceptable for mood logs).
 * - **Stored `dayKey` on old writes:** Older logs may carry a wake-day `dayKey` field;
 *   aggregates ignore it and always derive from `log_date` via `calendarDayKeyLocal`.
 * - **Counselor device vs student:** Counselor views derive keys from log timestamps in
 *   the counselor app's local timezone when rendering aggregates — typically fine if logs
 *   carry correct absolute times.
 */

/** Local calendar date key (`YYYY-MM-DD`) from the device's timezone — single model for Journal + Analytics. */
export function calendarDayKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Wake-day style key in `timezone`, rolling times before `resetHour` onto the prior date.
 * Prefer `calendarDayKeyLocal` for user-visible consistency unless you explicitly need this.
 */
export function getDayKey(
  timestamp: Date,
  resetHour: number,
  timezone: string,
): string {
  const h = Math.min(23, Math.max(0, Math.floor(resetHour)));
  const tz = timezone?.trim() || "UTC";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(timestamp);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  const hourStr = parts.find((p) => p.type === "hour")?.value;
  if (!y || !m || !d) {
    return `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, "0")}-${String(timestamp.getDate()).padStart(2, "0")}`;
  }
  let day = parseInt(d, 10);
  let month = parseInt(m, 10);
  let year = parseInt(y, 10);
  const localHour = hourStr != null ? parseInt(hourStr, 10) : 0;
  if (localHour < h) {
    const dt = new Date(year, month - 1, day);
    dt.setDate(dt.getDate() - 1);
    year = dt.getFullYear();
    month = dt.getMonth() + 1;
    day = dt.getDate();
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function defaultUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
