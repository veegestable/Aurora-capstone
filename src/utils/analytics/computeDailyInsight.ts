type StressBand = 'Low' | 'Moderate' | 'High'

function energyToMoodScale(energy: number): number {
  const e = Number(energy)
  if (!Number.isFinite(e)) return 3
  return Math.min(5, Math.max(1, Math.ceil(e / 2)))
}

function classifyStress(moodScale: number): StressBand {
  const score = (5 - moodScale) / 4
  if (score >= 0.75) return 'High'
  if (score >= 0.4) return 'Moderate'
  return 'Low'
}

function getFeedback(stress: StressBand, mood: number): string {
  if (stress === 'High') return 'You may have had a heavy day. Consider taking short breaks and organizing your tasks into smaller steps.'
  if (stress === 'Moderate') return "You're managing your day fairly well. Keep a steady pace and take time to rest when needed."
  if (stress === 'Low' && mood >= 4) return 'You seem to be doing well today. Keep up your current routine.'
  return 'Keep tracking your mood regularly to better understand your daily patterns.'
}

const DEFAULT_INSIGHT = 'Complete a check-in to get a personalized note based on your mood and energy.'

export function computeDailyInsight(
  logs: { log_date: Date | string; energy_level: number }[]
): string {
  if (logs.length === 0) return DEFAULT_INSIGHT

  const sorted = [...logs].sort((a, b) => {
    const da = a.log_date instanceof Date ? a.log_date : new Date(a.log_date)
    const db = b.log_date instanceof Date ? b.log_date : new Date(b.log_date)
    return db.getTime() - da.getTime()
  })

  const latest = sorted[0]
  const moodScale = energyToMoodScale(latest.energy_level ?? 5)
  const band = classifyStress(moodScale)
  return getFeedback(band, moodScale)
}