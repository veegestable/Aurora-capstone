/**
 * Schedule boundaries (device-local calendar, same basis as `calendarDayKeyLocal`):
 * when a usual time exists, clock times before that boundary still belong to the
 * previous calendar day's cycle (sleep once per wake cycle, bath once per bath cycle).
 */
import { calendarDayKeyLocal } from "./dayKey";

function parseHHmm(hhmm: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || "").trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return {
    h: Math.max(0, Math.min(23, h)),
    m: Math.max(0, Math.min(59, min)),
  };
}

/**
 * Day key for the cycle that contains `now` when the user has a usual boundary time
 * (wake or bath). Empty / invalid `usualHHmm` falls back to today's calendar key.
 */
export function cycleDayKeyForUsualTime(now: Date, usualHHmm: string): string {
  const p = parseHHmm(usualHHmm);
  if (!p) return calendarDayKeyLocal(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  const boundaryM = p.h * 60 + p.m;
  if (mins < boundaryM) {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return calendarDayKeyLocal(y);
  }
  return calendarDayKeyLocal(now);
}

/** True if local clock today is strictly before `HH:mm` on the same calendar date. */
export function isBeforeUsualHHmmToday(now: Date, usualHHmm: string): boolean {
  const p = parseHHmm(usualHHmm);
  if (!p) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins < p.h * 60 + p.m;
}
