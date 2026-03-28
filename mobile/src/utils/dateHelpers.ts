export function formatSchoolYear(startYear: number): string {
    return `${startYear}-${startYear + 1}`;
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.toDateString() === b.toDateString();
}

/**
 * Strip/replace exotic spaces (NBSP, narrow NBSP U+202F from iOS time pickers, etc.)
 * so `new Date(...)` and regex time parsing behave consistently on Hermes.
 */
export function normalizeScheduleWhitespace(input: string): string {
    return input
        .replace(/\u202f/g, ' ')
        .replace(/\u00a0/g, ' ')
        .replace(/\u2007/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Parse preferredTime string to Date.
 * Handles formats like "October 24, 2024, 2:30 PM" or "March 12, 2026 at 10:30 AM".
 * Returns null if parsing fails.
 */
export function parsePreferredTimeToDate(preferredTime: string): Date | null {
    if (!preferredTime?.trim()) return null;
    try {
        const cleaned = normalizeScheduleWhitespace(preferredTime).replace(/\s+at\s+/i, ', ');
        const parsed = new Date(cleaned);
        return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
}

/**
 * Parse 12h time string into hours/minutes for a calendar local date.
 */
function parseTimePartsOnDate(baseYear: number, baseMonth: number, baseDay: number, timeStr: string): Date | null {
    const t = normalizeScheduleWhitespace(timeStr);
    const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?$/i);
    if (!m) return null;
    let hour = parseInt(m[1], 10);
    const minute = parseInt(m[2], 10);
    const ap = m[4]?.toUpperCase();
    if (ap === 'PM' && hour < 12) hour += 12;
    if (ap === 'AM' && hour === 12) hour = 0;
    if (!ap && hour > 23) return null;
    return new Date(baseYear, baseMonth, baseDay, hour, minute, 0, 0);
}

/**
 * Parse slot { date, time } to Date.
 * Handles " at " in time, ISO dates (YYYY-MM-DD), and date-only (end of local day for overdue checks).
 * Coerces string-ish values (some Firestore shapes stringify oddly until normalized upstream).
 */
export function parseSlotToDate(slot: { date: string; time: string } | null): Date | null {
    if (!slot?.date) return null;
    const datePart = normalizeScheduleWhitespace(String(slot.date));
    const timePart = slot.time != null ? normalizeScheduleWhitespace(String(slot.time)) : '';
    if (!datePart) return null;

    const tryCombined = (a: string): Date | null => {
        const normalized = normalizeScheduleWhitespace(a.replace(/\s+at\s+/i, ', '));
        const parsed = new Date(normalized);
        return isNaN(parsed.getTime()) ? null : parsed;
    };

    if (timePart) {
        const candidates = [
            `${datePart}, ${timePart}`,
            `${datePart} ${timePart}`,
            `${datePart}T${timePart}`,
        ];
        for (const c of candidates) {
            const d = tryCombined(c);
            if (d) return d;
        }
    }

    // ISO calendar date YYYY-MM-DD
    const iso = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
        const y = parseInt(iso[1], 10);
        const mo = parseInt(iso[2], 10) - 1;
        const day = parseInt(iso[3], 10);
        if (timePart) {
            const withTime = parseTimePartsOnDate(y, mo, day, timePart);
            if (withTime) return withTime;
        }
        return new Date(y, mo, day, 23, 59, 59, 999);
    }

    const dateOnlyTry = new Date(datePart);
    if (!isNaN(dateOnlyTry.getTime())) {
        const y = dateOnlyTry.getFullYear();
        const mo = dateOnlyTry.getMonth();
        const day = dateOnlyTry.getDate();
        if (timePart) {
            const withTime = parseTimePartsOnDate(y, mo, day, timePart);
            if (withTime) return withTime;
        }
        return new Date(y, mo, day, 23, 59, 59, 999);
    }

    // e.g. date "March 12" + time "2026 at 10:30 AM" (year wrongly in time field) — same path as preferredTime
    if (timePart) {
        const viaPreferred = parsePreferredTimeToDate(`${datePart} at ${timePart}`);
        if (viaPreferred) return viaPreferred;
        const viaPreferred2 = parsePreferredTimeToDate(`${datePart}, ${timePart}`);
        if (viaPreferred2) return viaPreferred2;
    }

    /** Hermes / some locales: `new Date("March 22, 2026, 1:23 PM")` can be Invalid — build local Date manually. */
    const manual = parseEnglishMonthDayYearWithTime(datePart, timePart);
    if (manual) return manual;

    return null;
}

const ENGLISH_MONTHS: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
};

/**
 * "March 22, 2026" + "1:23 PM" → local Date (no `Date.parse` quirks).
 */
function parseEnglishMonthDayYearWithTime(datePart: string, timePart: string): Date | null {
    const n = normalizeScheduleWhitespace(datePart);
    const dm = n.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (!dm) return null;
    const mon = ENGLISH_MONTHS[dm[1].toLowerCase()];
    if (mon === undefined) return null;
    const day = parseInt(dm[2], 10);
    const year = parseInt(dm[3], 10);
    const tp = timePart ? normalizeScheduleWhitespace(timePart) : '';
    if (!tp) return new Date(year, mon, day, 23, 59, 59, 999);
    const tm = tp.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?$/i);
    if (!tm) return new Date(year, mon, day, 23, 59, 59, 999);
    let hour = parseInt(tm[1], 10);
    const minute = parseInt(tm[2], 10);
    const ap = tm[4]?.toUpperCase();
    if (ap === 'PM' && hour < 12) hour += 12;
    if (ap === 'AM' && hour === 12) hour = 0;
    if (!ap && hour > 23) return null;
    return new Date(year, mon, day, hour, minute, 0, 0);
}

/**
 * Check if we're at or past the session's scheduled date/time (counselor can mark attendance).
 */
export function isSessionScheduledTimeReached(slot: { date: string; time: string } | null): boolean {
    const parsed = parseSlotToDate(slot);
    return parsed != null && !isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
}

/**
 * Check if a proposed session time has already passed (expired).
 */
export function isSessionTimeExpired(preferredTime: string): boolean {
    const date = parsePreferredTimeToDate(preferredTime);
    return date ? date.getTime() < Date.now() : false;
}
