/**
 * Calendar "day" for grouping logs, relative to a configurable local reset hour.
 */
export function getDayKey(timestamp: Date, resetHour: number, timezone: string): string {
  const h = Math.min(23, Math.max(0, Math.floor(resetHour)));
  const tz = timezone?.trim() || 'UTC';
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(timestamp);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  const hourStr = parts.find((p) => p.type === 'hour')?.value;
  if (!y || !m || !d) {
    return `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
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
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function defaultUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
