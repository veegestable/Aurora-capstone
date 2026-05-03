function calendarDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function computeStreak(
  logs: { timestamp: Date | string }[],
  fromDate = new Date()
): number {
  const keys = new Set(
    logs.map((l) => {
      const d = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
      return calendarDayKey(d)
    })
  )

  let streak = 0
  const d = new Date(fromDate)
  d.setHours(12, 0, 0, 0)

  while (keys.has(calendarDayKey(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }

  return streak
}