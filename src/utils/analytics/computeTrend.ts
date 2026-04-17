export type TrendDirection = 'Improving' | 'Stable' | 'Declining'

export function computeTrend(
  logs: { log_date: Date | string; energy_level: number }[]
): TrendDirection {
  if (logs.length < 2) return 'Stable'

  const sorted = [...logs].sort((a, b) => {
    const da = a.log_date instanceof Date ? a.log_date : new Date(a.log_date)
    const db = b.log_date instanceof Date ? b.log_date : new Date(b.log_date)
    return db.getTime() - da.getTime()
  })

  const recent = sorted.slice(0, 3)
  const prior = sorted.slice(3, 6)

  if (prior.length === 0) return 'Stable'

  const avg = (items: { energy_level: number }[]) => items.reduce((sum, l) => sum + l.energy_level, 0) / items.length

  const recentAvg = avg(recent)
  const priorAvg = avg(prior)
  const diff = recentAvg - priorAvg

  if (diff > 0.75) return 'Improving'
  if (diff < -0.75) return 'Declining'
  return 'Stable'
}