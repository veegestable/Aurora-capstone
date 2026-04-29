type StressBand = 'Low' | 'Moderate' | 'High'

function classifyStress(stress: number): StressBand {
  // V2 stress is 1-5
  if (stress >= 4) return 'High'
  if (stress >= 3) return 'Moderate'
  return 'Low'
}

function getFeedback(stress: StressBand, energy: number): string {
  if (stress === 'High') return 'You may have had a heavy day. Consider taking short breaks and organizing your tasks into smaller steps.'
  if (stress === 'Moderate') return "You're managing your day fairly well. Keep a steady pace and take time to rest when needed."
  if (stress === 'Low' && energy >= 3) return 'You seem to be doing well today. Keep up your current routine.'
  return 'Keep tracking your mood regularly to better understand your daily patterns.'
}

const DEFAULT_INSIGHT = 'Complete a check-in to get a personalized note based on your mood and energy.'

export function computeDailyInsight(
  logs: { timestamp: Date | string; energy: number; stress: number }[]
): string {
  if (logs.length === 0) return DEFAULT_INSIGHT

  const sorted = [...logs].sort((a, b) => {
    const da = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp)
    const db = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp)
    return db.getTime() - da.getTime()
  })

  const latest = sorted[0]
  const band = classifyStress(latest.stress ?? 3)
  return getFeedback(band, latest.energy ?? 3)
}