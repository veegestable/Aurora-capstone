export interface StabilityMetrics {
  percentage: number
  label: string
}

export function computeStability(
  logs: { timestamp: Date | string; intensity: number }[]
): StabilityMetrics {
  if (logs.length < 2) return { percentage: 100, label: 'Perfectly Stable' }

  const sorted = [...logs].sort((a, b) => {
    const da = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp)
    const db = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp)
    return db.getTime() - da.getTime()
  })

  // Calculate the average difference in intensity between consecutive recent logs
  const recentLogs = sorted.slice(0, 10)
  if (recentLogs.length < 2) return { percentage: 100, label: 'Perfectly Stable' }

  let totalDiff = 0
  for (let i = 0; i < recentLogs.length - 1; i++) {
    totalDiff += Math.abs(recentLogs[i].intensity - recentLogs[i+1].intensity)
  }
  
  const avgDiff = totalDiff / (recentLogs.length - 1)
  
  // Normalize to 100% (where 0 diff = 100%, and large swings lower the score)
  const percentage = Math.max(0, Math.min(100, Math.round(100 - (avgDiff * 10))))

  let label = 'Very Stable'
  if (percentage < 50) label = 'Highly Variable'
  else if (percentage < 75) label = 'Some Fluctuations'

  return { percentage, label }
}