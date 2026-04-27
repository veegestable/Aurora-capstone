import { getEmotionLabel } from '../../utils/moodColors'

export interface MoodLogEntry {
  log_date: Date
  energy_level: number
  stress_level: number
  dominant_emotion?: string
}

export interface WeekSummaryInput {
  weekLabel: string;
  dominantMood: string;
  averageIntensity: number;
  mostFrequentMood: string;
  bestDay: string;
  hardestDay: string;
  totalEntries: number;
  dailyBreakdown: {
    day: string;
    dominantMood: string;
    avgIntensity: number;
    entryCount: number;
  }[];
}

export type WeeklySummaryResult = {
  summary: string;
  source: 'ai' | 'fallback';
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDayKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function buildTemplateWeeklySummary(data: WeekSummaryInput): string {
  if (data.totalEntries === 0) {
    return 'No check-ins were recorded in this window.'
  }
  const parts: string[] = []
  parts.push(`You logged ${data.totalEntries} check-in${data.totalEntries === 1 ? '' : 's'} ${data.weekLabel}.`)
  parts.push(`Average intensity was about ${data.averageIntensity.toFixed(1)} (1–10), and the mood that appeared most often was ${data.mostFrequentMood}.`)
  if (data.bestDay !== '—' && data.hardestDay !== '—' && data.bestDay !== data.hardestDay) {
    parts.push(`You tended to rate highest on ${data.bestDay} and most strained on ${data.hardestDay}.`)
  }
  return parts.join(' ')
}

export function buildWeekSummaryInput(logs: MoodLogEntry[]): WeekSummaryInput {
  const today = new Date()
  const dayKeys: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - i)
    dayKeys.push(getDayKey(d))
  }

  const entries = logs.map(l => ({
    ...l,
    dayKey: getDayKey(new Date(l.log_date)),
    mood: l.dominant_emotion ? getEmotionLabel(l.dominant_emotion) : 'Unknown',
    intensity: l.energy_level
  })).filter(e => dayKeys.includes(e.dayKey))

  const moods = entries.map(e => e.mood.toLowerCase())
  const counts: Record<string, number> = {}
  for (const m of moods) counts[m] = (counts[m] ?? 0) + 1
  let mostFrequentMood = '—'
  let mc = 0
  for (const [k, v] of Object.entries(counts)) {
    if (v > mc) {
      mc = v
      mostFrequentMood = k
    }
  }

  const averageIntensity = entries.length > 0 
    ? entries.reduce((s, e) => s + e.intensity, 0) / entries.length 
    : 0

  const dailyBreakdown = dayKeys.map(dk => {
    const dayEntries = entries.filter(e => e.dayKey === dk)
    const [y, m, d] = dk.split('-').map(Number)
    const wd = DOW[new Date(y, m - 1, d).getDay()]
    
    let domMood = '—'
    if (dayEntries.length > 0) {
      const dCounts: Record<string, number> = {}
      dayEntries.forEach(e => { dCounts[e.mood] = (dCounts[e.mood] ?? 0) + 1 })
      domMood = Object.entries(dCounts).sort((a,b) => b[1] - a[1])[0][0]
    }

    return {
      day: wd,
      dominantMood: domMood,
      avgIntensity: dayEntries.length ? dayEntries.reduce((s,e) => s + e.intensity, 0) / dayEntries.length : 0,
      entryCount: dayEntries.length,
    }
  })

  let bestDay = '—'
  let bestI = -1
  let hardestDay = '—'
  let hardestRank = Infinity

  dayKeys.forEach((dk, i) => {
    const dayEntries = entries.filter(e => e.dayKey === dk)
    if (dayEntries.length === 0) return
    const avgI = dayEntries.reduce((s,e) => s + e.intensity, 0) / dayEntries.length
    const avgS = dayEntries.reduce((s,e) => s + e.stress_level, 0) / dayEntries.length
    
    if (avgI > bestI) {
      bestI = avgI
      bestDay = dailyBreakdown[i].day
    }
    const rank = (avgI * -1) + avgS
    if (rank < hardestRank) {
      hardestRank = rank
      hardestDay = dailyBreakdown[i].day
    }
  })

  return {
    weekLabel: 'this week',
    dominantMood: mostFrequentMood,
    averageIntensity,
    mostFrequentMood,
    bestDay,
    hardestDay,
    totalEntries: entries.length,
    dailyBreakdown,
  }
}