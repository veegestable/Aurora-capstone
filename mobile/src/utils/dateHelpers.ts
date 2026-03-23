export function formatSchoolYear(startYear: number): string {
    return `${startYear}-${startYear + 1}`;
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.toDateString() === b.toDateString();
}

/**
 * Parse preferredTime string to Date.
 * Handles formats like "October 24, 2024, 2:30 PM" or "March 12, 2026 at 10:30 AM".
 * Returns null if parsing fails.
 */
export function parsePreferredTimeToDate(preferredTime: string): Date | null {
    if (!preferredTime?.trim()) return null;
    try {
        const normalized = preferredTime.replace(/\s+at\s+/i, ', ');
        const parsed = new Date(normalized);
        return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
}

/**
 * Check if a proposed session time has already passed (expired).
 */
export function isSessionTimeExpired(preferredTime: string): boolean {
    const date = parsePreferredTimeToDate(preferredTime);
    return date ? date.getTime() < Date.now() : false;
}

/**
 * Check if we're at or past the session's scheduled date/time (counselor can mark attendance).
 * Handles formats like "March 12, 2026, 1:20 PM" or "March 12, 2026 at 10:30 AM".
 */
export function isSessionScheduledTimeReached(slot: { date: string; time: string } | null): boolean {
    if (!slot?.date || !slot?.time) return false;
    try {
        let dateStr = `${slot.date}, ${slot.time}`;
        dateStr = dateStr.replace(/\s+at\s+/i, ', ');
        const parsed = new Date(dateStr);
        return !isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
    } catch {
        return false;
    }
}

/**
 * Parse slot { date, time } to Date. Handles " at " in time string.
 */
export function parseSlotToDate(slot: { date: string; time: string } | null): Date | null {
    if (!slot?.date || !slot?.time) return null;
    try {
        const dateStr = `${slot.date}, ${slot.time}`.replace(/\s+at\s+/i, ', ');
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
}
