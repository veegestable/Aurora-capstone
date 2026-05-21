/** Local calendar day key YYYY-MM-DD (matches mobile analytics). */
export function calendarDayKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Longest consecutive logged days within a rolling window ending on `endDate`. */
export function calculateHighestCheckInStreakInWindow(
  logs: { log_date: Date }[],
  dayCount: number,
  endDate = new Date(),
): number {
  if (dayCount <= 0) return 0

  const end = new Date(endDate)
  end.setHours(12, 0, 0, 0)

  const windowKeys: string[] = []
  const windowKeySet = new Set<string>()
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const key = calendarDayKeyLocal(d)
    windowKeys.push(key)
    windowKeySet.add(key)
  }

  const loggedInWindow = new Set<string>()
  for (const log of logs) {
    const key = calendarDayKeyLocal(
      log.log_date instanceof Date ? log.log_date : new Date(log.log_date),
    )
    if (windowKeySet.has(key)) loggedInWindow.add(key)
  }

  let best = 0
  let current = 0
  for (const key of windowKeys) {
    if (loggedInWindow.has(key)) {
      current++
      if (current > best) best = current
    } else {
      current = 0
    }
  }
  return best
}
