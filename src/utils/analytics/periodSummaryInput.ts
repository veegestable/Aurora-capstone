import type { MoodLogEntryRow } from '../../services/mood/types'
import { calendarDayKeyLocal } from './dateKeys'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface PeriodSummaryInput {
  weekLabel: string
  dominantMood: string
  averageIntensity: number
  mostFrequentMood: string
  bestDay: string
  hardestDay: string
  totalEntries: number
  dailyBreakdown: {
    day: string
    dominantMood: string
    avgIntensity: number
    entryCount: number
  }[]
}

function toLocalDateKey(d: Date): string {
  return calendarDayKeyLocal(d)
}

function aggregateDay(logs: MoodLogEntryRow[]) {
  if (logs.length === 0) {
    return { dominantMood: '—', avgIntensity: 0, entryCount: 0, avgStress: 0 }
  }
  const moodCounts: Record<string, number> = {}
  let intensitySum = 0
  let stressSum = 0
  for (const l of logs) {
    const m = (l.mood || 'neutral').toLowerCase()
    moodCounts[m] = (moodCounts[m] ?? 0) + 1
    intensitySum += l.intensity ?? 0
    stressSum += l.stress ?? 0
  }
  let dominantMood = 'neutral'
  let max = 0
  for (const [k, v] of Object.entries(moodCounts)) {
    if (v > max) {
      max = v
      dominantMood = k
    }
  }
  return {
    dominantMood,
    avgIntensity: intensitySum / logs.length,
    entryCount: logs.length,
    avgStress: stressSum / logs.length,
  }
}

export function buildTemplatePeriodSummary(data: PeriodSummaryInput): string {
  if (data.totalEntries === 0) {
    return 'No check-ins were recorded in this window.'
  }
  const parts: string[] = []
  parts.push(
    `You logged ${data.totalEntries} check-in${data.totalEntries === 1 ? '' : 's'} ${data.weekLabel}.`,
  )
  parts.push(
    `Average intensity was about ${data.averageIntensity.toFixed(1)} (1–10), and the mood that appeared most often was ${data.mostFrequentMood}.`,
  )
  if (data.bestDay !== '—' && data.hardestDay !== '—' && data.bestDay !== data.hardestDay) {
    parts.push(`You tended to rate highest on ${data.bestDay} and most strained on ${data.hardestDay}.`)
  }
  return parts.join(' ')
}

export function buildPeriodSummaryInput(
  logs: MoodLogEntryRow[],
  dayCount: 7 | 30,
  periodLabel = dayCount === 30 ? 'the last 30 days' : 'the last 7 days',
): PeriodSummaryInput {
  const today = new Date()
  const dayKeys: string[] = []
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - i)
    dayKeys.push(calendarDayKeyLocal(d))
  }

  const periodLogs = logs.filter((l) => {
    const t = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
    return dayKeys.includes(toLocalDateKey(t))
  })

  const moods = periodLogs.map((l) => (l.mood || 'neutral').toLowerCase())
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

  const averageIntensity =
    periodLogs.length > 0
      ? periodLogs.reduce((s, l) => s + (l.intensity ?? 0), 0) / periodLogs.length
      : 0

  const dailyBreakdown = dayKeys.map((dk) => {
    const dayLogs = periodLogs.filter((l) => {
      const t = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
      return toLocalDateKey(t) === dk
    })
    const agg = aggregateDay(dayLogs)
    const [y, m, d] = dk.split('-').map(Number)
    const wd = DOW[new Date(y, m - 1, d).getDay()]
    return {
      day: wd,
      dominantMood: agg.dominantMood,
      avgIntensity: agg.avgIntensity,
      entryCount: agg.entryCount,
    }
  })

  let bestDay = '—'
  let bestI = -1
  let hardestDay = '—'
  let hardestRank = Infinity
  for (let i = 0; i < dayKeys.length; i++) {
    const dayLogs = periodLogs.filter((l) => {
      const t = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
      return toLocalDateKey(t) === dayKeys[i]
    })
    const agg = aggregateDay(dayLogs)
    if (agg.entryCount === 0) continue
    if (agg.avgIntensity > bestI) {
      bestI = agg.avgIntensity
      bestDay = dailyBreakdown[i].day
    }
    const rank = agg.avgIntensity * -1 + agg.avgStress
    if (rank < hardestRank) {
      hardestRank = rank
      hardestDay = dailyBreakdown[i].day
    }
  }

  const roll = aggregateDay(periodLogs)
  return {
    weekLabel: periodLabel,
    dominantMood: roll.dominantMood,
    averageIntensity,
    mostFrequentMood,
    bestDay,
    hardestDay,
    totalEntries: periodLogs.length,
    dailyBreakdown,
  }
}
