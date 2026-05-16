import { calendarDayKeyLocal } from "../dayKey";

export { calendarDayKeyLocal };

/** Logs whose calendar local day differs from `reference`'s calendar local day (newest first). */
export function getMostRecentLogNotOnSameCalendarDay<
  T extends { log_date: Date },
>(logs: T[], reference: Date): T | undefined {
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

/** Consecutive calendar days (ending `fromDate`) with at least one check-in. */
export function calculateCheckInStreak(
  logs: { log_date: Date }[],
  fromDate = new Date(),
): number {
  const keys = new Set(
    logs.map((l) =>
      calendarDayKeyLocal(
        l.log_date instanceof Date ? l.log_date : new Date(l.log_date),
      ),
    ),
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

/** Longest consecutive logged days within a rolling window ending on `endDate`. */
export function calculateHighestCheckInStreakInWindow(
  logs: { log_date: Date }[],
  dayCount: number,
  endDate = new Date(),
): number {
  if (dayCount <= 0) return 0;

  const end = new Date(endDate);
  end.setHours(12, 0, 0, 0);

  const windowKeys: string[] = [];
  const windowKeySet = new Set<string>();
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const key = calendarDayKeyLocal(d);
    windowKeys.push(key);
    windowKeySet.add(key);
  }

  const loggedInWindow = new Set<string>();
  for (const log of logs) {
    const key = calendarDayKeyLocal(
      log.log_date instanceof Date ? log.log_date : new Date(log.log_date),
    );
    if (windowKeySet.has(key)) loggedInWindow.add(key);
  }

  let best = 0;
  let current = 0;
  for (const key of windowKeys) {
    if (loggedInWindow.has(key)) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}
