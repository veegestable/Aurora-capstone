import { getDayKey } from '../dayKey';

/** Calendar day key in local terms (avoids UTC drift for "today"). */
export function calendarDayKeyLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function getMostRecentLogNotOnSameCalendarDay<T extends { log_date: Date }>(
    logs: T[],
    reference: Date
): T | undefined {
    const refKey = calendarDayKeyLocal(reference);
    const sorted = [...logs].sort((a, b) => {
        const da = a.log_date instanceof Date ? a.log_date : new Date(a.log_date);
        const db = b.log_date instanceof Date ? b.log_date : new Date(b.log_date);
        return db.getTime() - da.getTime();
    });
    return sorted.find((l) => {
        const ld = l.log_date instanceof Date ? l.log_date : new Date(l.log_date);
        return calendarDayKeyLocal(ld) !== refKey;
    });
}

/** Consecutive calendar days (ending today) with at least one check-in. */
export function calculateCheckInStreak(logs: { log_date: Date }[], fromDate = new Date()): number {
    const keys = new Set(
        logs.map((l) => calendarDayKeyLocal(l.log_date instanceof Date ? l.log_date : new Date(l.log_date)))
    );
    let streak = 0;
    const d = new Date(fromDate);
    d.setHours(12, 0, 0, 0);
    while (keys.has(calendarDayKeyLocal(d))) {
        streak++;
        d.setDate(d.getDate() - 1);
    }
    return streak;
}

/** Streak using explicit Aurora `dayKey` values (respects day reset hour). */
export function calculateCheckInStreakByDayKey(
    dayKeys: Iterable<string>,
    fromDate = new Date(),
    resetHour: number,
    timezone: string
): number {
    const keys = new Set(dayKeys);
    let streak = 0;
    const d = new Date(fromDate);
    d.setHours(12, 0, 0, 0);
    while (keys.has(getDayKey(d, resetHour, timezone))) {
        streak++;
        d.setDate(d.getDate() - 1);
    }
    return streak;
}
