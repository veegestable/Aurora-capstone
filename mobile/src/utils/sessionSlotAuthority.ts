import { DateTime } from "luxon";
import { Timestamp } from "firebase/firestore";
import { SESSION_SCHEDULING_TIMEZONE } from "../constants/session-scheduling";
import { normalizeScheduleWhitespace } from "./dateHelpers";

/**
 * Strip/replace exotic spaces (NBSP, narrow NBSP) before Luxon parsing on Hermes/iOS.
 */
function norm(s: string): string {
  return normalizeScheduleWhitespace(s);
}

function parse12Or24hm(
  timeStr: string,
): { hour: number; minute: number } | null {
  const t = norm(timeStr);
  const m12 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?$/i);
  if (m12) {
    let hour = parseInt(m12[1], 10);
    const minute = parseInt(m12[2], 10);
    const ap = m12[4]?.toUpperCase();
    if (ap === "PM" && hour < 12) hour += 12;
    if (ap === "AM" && hour === 12) hour = 0;
    if (!ap && hour > 23) return null;
    return { hour, minute };
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hour = parseInt(m24[1], 10);
    const minute = parseInt(m24[2], 10);
    if (hour > 23 || minute > 59) return null;
    return { hour, minute };
  }
  return null;
}

/**
 * Parse `{ date, time }` as Manila wall time. Returns epoch ms in UTC, or null.
 */
export function parseSessionSlotToMillisManila(slot: {
  date: string;
  time: string;
}): number | null {
  const datePart = norm(String(slot.date ?? ""));
  const timePart =
    slot.time != null ? norm(String(slot.time)) : "";
  if (!datePart) return null;

  const zone = SESSION_SCHEDULING_TIMEZONE;

  const iso = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const mo = parseInt(iso[2], 10);
    const d = parseInt(iso[3], 10);
    if (!timePart) {
      const dt = DateTime.fromObject(
        { year: y, month: mo, day: d, hour: 23, minute: 59, second: 59, millisecond: 999 },
        { zone },
      );
      return dt.isValid ? dt.toMillis() : null;
    }
    const hm = parse12Or24hm(timePart);
    if (!hm) return null;
    const dt = DateTime.fromObject(
      { year: y, month: mo, day: d, hour: hm.hour, minute: hm.minute, second: 0, millisecond: 0 },
      { zone },
    );
    return dt.isValid ? dt.toMillis() : null;
  }

  if (timePart) {
    const combined = `${datePart}, ${timePart}`;
    const splitTry = DateTime.fromFormat(combined, "MMMM d, yyyy, h:mm a", {
      zone,
      locale: "en",
    });
    if (splitTry.isValid) return splitTry.toMillis();
    const splitTry2 = DateTime.fromFormat(combined, "MMMM d, yyyy, hh:mm a", {
      zone,
      locale: "en",
    });
    if (splitTry2.isValid) return splitTry2.toMillis();
  }

  const dateOnly = DateTime.fromFormat(datePart, "MMMM d, yyyy", {
    zone,
    locale: "en",
  });
  if (dateOnly.isValid) {
    if (!timePart) {
      const end = dateOnly.set({
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 999,
      });
      return end.toMillis();
    }
    const hm = parse12Or24hm(timePart);
    if (!hm) return null;
    const full = dateOnly.set({
      hour: hm.hour,
      minute: hm.minute,
      second: 0,
      millisecond: 0,
    });
    return full.isValid ? full.toMillis() : null;
  }

  return null;
}

/**
 * Preferred-time string produced by mobile `toLocaleDateString(..., hour, minute)`
 * or counselor split "date, time" — interpreted as Manila.
 */
export function parsePreferredTimeStringManila(preferredTime: string): number | null {
  if (!preferredTime?.trim()) return null;
  const cleaned = norm(preferredTime).replace(/\s+at\s+/i, ", ");
  const zone = SESSION_SCHEDULING_TIMEZONE;

  const fmts = ["MMMM d, yyyy, h:mm a", "MMMM d, yyyy, hh:mm a"];
  for (const f of fmts) {
    const dt = DateTime.fromFormat(cleaned, f, { zone, locale: "en" });
    if (dt.isValid) return dt.toMillis();
  }
  return null;
}

export function firestoreTimestampFromSlotManila(slot: {
  date: string;
  time: string;
}): Timestamp {
  const ms = parseSessionSlotToMillisManila(slot);
  if (ms == null || !Number.isFinite(ms)) {
    throw new Error(
      "Could not interpret this session time. Please pick a valid date and time.",
    );
  }
  return Timestamp.fromMillis(ms);
}

/** True if instant is strictly after `nowMs` (server or client), with small clock skew slack. */
export function isSessionStartInFutureManila(
  instantMs: number,
  nowMs: number,
  slackMs = 60_000,
): boolean {
  return instantMs > nowMs - slackMs;
}
