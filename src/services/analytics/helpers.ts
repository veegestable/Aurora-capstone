export type WeeklyTrend = 'Improving' | 'Declining' | 'Stable'

export interface WeeklyAiResult {
  trend: WeeklyTrend
  summary: string
  observations: string[]
  recommendations: string[]
  support_note: string
  /** True when OpenAI returned valid JSON; false when fallback was used. */
  fromAi: boolean
}

export interface MoodLogEntry {
  log_date: Date
  energy_level: number
  stress_level: number
}

type StressBand = 'Low' | 'Moderate' | 'High' | 'None'

export interface WeekPayload {
  dates: string[]
  daily_mood: number[]
  daily_stress: StressBand[]
}

/** Map numeric stress_level (1-10) to a band label. */
function classifyStress(level: number): StressBand {
  if (level <= 3) return 'Low'
  if (level <= 6) return 'Moderate'
  return 'High'
}

/** Map energy_level (1-10) to a 1-5 mood scale. */
function energyToMoodScale(energy: number): number {
  if (energy <= 2) return 1
  if (energy <= 4) return 2
  if (energy <= 6) return 3
  if (energy <= 8) return 4
  return 5
}

/** Produce a date string like "2026-04-19" from a Date. */
function dayKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

function isWeeklyTrend(s: string): s is WeeklyTrend {
  return s === 'Improving' || s === 'Declining' || s === 'Stable'
}

/** Build aligned 7-day series from mood logs. */
export function buildWeekPayload(logs: MoodLogEntry[]): WeekPayload {
  const today = new Date()
  const dates: string[] = []
  const daily_mood: number[] = []
  const daily_stress: StressBand[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = dayKey(d)
    dates.push(key)

    const dayLogs = logs.filter((l) => dayKey(l.log_date) === key)
    if (dayLogs.length === 0) {
      daily_mood.push(-1)
      daily_stress.push('None')
      continue
    }

    const latest = dayLogs.reduce((a, b) =>
      b.log_date.getTime() >= a.log_date.getTime() ? b : a
    )
    daily_mood.push(energyToMoodScale(latest.energy_level))
    daily_stress.push(classifyStress(latest.stress_level))
  }

  return { dates, daily_mood, daily_stress }
}

/** Parse OpenAI JSON response into a WeeklyAiResult. */
export function parseAiResponse(raw: string): WeeklyAiResult | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const trend = typeof o.trend === 'string' && isWeeklyTrend(o.trend) ? o.trend : null
    const summary = typeof o.summary === 'string' ? o.summary : null

    if (!trend || !summary) return null

    return {
      trend,
      summary,
      observations: Array.isArray(o.observations)
        ? o.observations.filter((x): x is string => typeof x === 'string')
        : [],
      recommendations: Array.isArray(o.recommendations)
        ? o.recommendations.filter((x): x is string => typeof x === 'string')
        : [],
      support_note: typeof o.support_note === 'string' ? o.support_note : '',
      fromAi: true,
    }
  } catch {
    return null
  }
}

/** Deterministic fallback when OpenAI is unavailable. */
export function deterministicFallback(payload: WeekPayload): WeeklyAiResult {
  const moods = payload.daily_mood.filter((m) => m >= 1 && m <= 5)
  let trend: WeeklyTrend = 'Stable'

  if (moods.length >= 4) {
    const mid = Math.floor(moods.length / 2)
    const firstHalf = moods.slice(0, mid)
    const secondHalf = moods.slice(mid)
    const avg1 = firstHalf.reduce((s, x) => s + x, 0) / firstHalf.length
    const avg2 = secondHalf.reduce((s, x) => s + x, 0) / secondHalf.length
    if (avg2 - avg1 >= 0.35) trend = 'Improving'
    else if (avg1 - avg2 >= 0.35) trend = 'Declining'
  }

  const daysLogged = moods.length
  const avgMood = daysLogged > 0
    ? (moods.reduce((s, x) => s + x, 0) / daysLogged).toFixed(1)
    : null

  const stressBands = payload.daily_stress.filter((s) => s !== 'None')
  const counts: Record<string, number> = {}
  for (const b of stressBands) counts[b] = (counts[b] ?? 0) + 1
  const dominantStress = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  const summaryParts: string[] = []
  if (daysLogged === 0) {
    summaryParts.push('No check-ins were recorded this week.')
  } else {
    if (avgMood) summaryParts.push(`Average mood was about ${avgMood} on a 1–5 scale.`)
    if (dominantStress !== '—') summaryParts.push(`Stress levels were mostly ${dominantStress}.`)
    summaryParts.push(`${daysLogged} day(s) had a check-in.`)
  }

  const lowMoodDays = payload.daily_mood.filter((m) => m >= 1 && m <= 2).length
  const highStressDays = payload.daily_stress.filter((s) => s === 'High').length

  return {
    trend,
    summary: summaryParts.join(' ') || 'Keep logging to see patterns.',
    observations: daysLogged > 0
      ? ['Keep up your daily check-in habit - consistency helps you notice patterns.']
      : ['No check-ins this week - your summary will fill in as you log.'],
    recommendations: [
      'Consider short breaks between study blocks.',
      'Try to spread tasks across the week when possible.',
    ],
    support_note:
      lowMoodDays >= 2 || highStressDays >= 2
        ? 'If you would like support, you can reach out to a guidance counselor through the app.'
        : '',
    fromAi: false,
  }
}