import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { moodService } from '../services/mood'
import type { MoodLogEntryRow } from '../services/mood/types'
import type { DayBar, WeekSummary } from '../types/journalAnalytics.types'
import {
  buildMoodChartAggregates,
  filterLogsToLast7CalendarDays,
  rollingSevenDayRangeMs,
} from '../utils/analytics/buildMoodChartAggregates'
import { computeStreak } from '../utils/analytics/computeStreak'
import { computeStability } from '../utils/analytics/computeStability'

// HELPERS

/** Returns "YYYY-MM-DD" in local time — used for date-matching logs to calendar days */
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns the start and end of a day in milliseconds */
function localDayBoundsMs(d: Date): { startMs: number; endMs: number } {
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  const end = new Date(d)
  end.setHours(23, 59, 59, 999)
  return { startMs: start.getTime(), endMs: end.getTime() }
}

/** Returns "Mon", "Tue", etc. — used for bar chart x-axis labels */
function getDayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

/** Returns the most frequent item in an array */
function mostCommon<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined
  const counts = new Map<T, number>()
  arr.forEach(v => counts.set(v, (counts.get(v) || 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

// LABEL CLASSIFIERS

function stressLevelLabel(avg: number): string {
  if (avg >= 4) return 'Elevated'
  if (avg >= 3) return 'Moderate'
  return 'Low'
}

function energyLevelLabel(avg: number): string {
  if (avg >= 4) return 'High'
  if (avg >= 3) return 'Steady'
  return 'Low'
}

function sleepSummaryLabel(logs: MoodLogEntryRow[]): string {
  const qualities = logs.map(l => l.sleepQuality).filter(Boolean)
  if (!qualities.length) return 'No data'
  return `Mostly ${mostCommon(qualities)}`
}

// BAR CHART COLORS

function stressBarColor(avg: number): string {
  if (avg >= 4) return '#EF4444'
  if (avg >= 3) return '#FB923C'
  return '#94A3B8'
}

function energyBarColor(avg: number): string {
  if (avg >= 4) return '#22C55E'
  if (avg >= 3) return '#FB923C'
  return '#94A3B8'
}

// TREND & INSIGHT GENERATORS

function computeTrendLabel(logs: MoodLogEntryRow[]): string {
  if (logs.length < 2) return 'Not enough data'
  const sorted = [...logs].sort((a, b) => {
    const da = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp)
    const db = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp)
    return da.getTime() - db.getTime()
  })
  const mid = Math.floor(sorted.length / 2)
  const avgFirst = sorted.slice(0, mid).reduce((s, l) => s + l.intensity, 0) / mid
  const avgSecond = sorted.slice(mid).reduce((s, l) => s + l.intensity, 0) / (sorted.length - mid)
  const diff = avgSecond - avgFirst
  if (Math.abs(diff) < 0.5) return 'Steady week'
  return diff > 0 ? 'Improving this week' : 'Ups and downs this week'
}

function computeInsight(logs: MoodLogEntryRow[]): string {
  if (!logs.length) return 'Complete a check-in to see insights.'
  const avgStress = logs.reduce((s, l) => s + l.stress, 0) / logs.length
  const mood = mostCommon(logs.map(l => l.mood)) || 'neutral'
  const hasSchool = logs.some(l => l.eventCategories?.includes('school'))
  const band = stressLevelLabel(avgStress).toLowerCase()

  if (hasSchool && avgStress >= 4) return `Heavy load: ${mood} mood with high stress suggests a demanding school day.`
  if (hasSchool && avgStress >= 3) return `Busy load: ${mood} mood with moderate stress suggests a steady but effort-heavy school day.`
  if (hasSchool) return `Light load: ${mood} mood with low stress — a manageable school day.`
  if (avgStress >= 4) return `${mood.charAt(0).toUpperCase() + mood.slice(1)} mood with high stress — consider taking short breaks.`
  return `${mood.charAt(0).toUpperCase() + mood.slice(1)} mood with ${band} stress. Keep tracking to see patterns.`
}

function computeSignals(logs: MoodLogEntryRow[]): string[] {
  if (!logs.length) return []
  const signals: string[] = []
  const schoolLogs = logs.filter(l => l.eventCategories?.includes('school'))
  if (schoolLogs.length > 0) {
    const tagCount = schoolLogs.reduce((s, l) => s + (l.eventTags?.length || 0), 0)
    signals.push(`School events: ${tagCount} across ${schoolLogs.length} check-in(s)`)
  }
  signals.push(`Mood: ${computeTrendLabel(logs)}`)
  const avgStress = logs.reduce((s, l) => s + l.stress, 0) / logs.length
  signals.push(`Stress: ${stressLevelLabel(avgStress)}`)
  return signals
}

// FREQUENCY AGGREGATORS

function computeTagFrequency(logs: MoodLogEntryRow[]): { tag: string; count: number }[] {
  const counts: Record<string, number> = {}
  logs.forEach(l => {
    l.eventTags?.forEach(tag => { counts[tag] = (counts[tag] || 0) + 1 })
  })
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

function computeCategoryFrequency(logs: MoodLogEntryRow[]): { category: string; count: number }[] {
  const counts: Record<string, number> = {}
  logs.forEach(l => {
    l.eventCategories?.forEach(c => { counts[c] = (counts[c] || 0) + 1 })
  })
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}

// CHART DATA BUILDERS
function computeDailyMetric(
  logs: MoodLogEntryRow[], field: 'stress' | 'energy', days: number, colorFn: (avg: number) => string
): DayBar[] {
  const today = new Date()
  const bars: DayBar[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = toLocalDateStr(d)
    const dayLogs = logs.filter(l => {
      const lt = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
      return toLocalDateStr(lt) === key
    })
    const avg = dayLogs.length > 0 ? dayLogs.reduce((s, l) => s + l[field], 0) / dayLogs.length : 0
    bars.push({ dayLabel: getDayLabel(d), avg: Math.round(avg * 10) / 10, color: dayLogs.length > 0 ? colorFn(avg) : '#334155', hasData: dayLogs.length > 0 })
  }
  return bars
}

// DETERMINISTIC WEEKLY SUMMARY (designed for future AI replacement)

function computeWeekSummary(logs: MoodLogEntryRow[]): WeekSummary {
  const avgStress = logs.length > 0 ? logs.reduce((s, l) => s + l.stress, 0) / logs.length : 0
  const avgEnergy = logs.length > 0 ? logs.reduce((s, l) => s + l.energy, 0) / logs.length : 0
  const stability = computeStability(logs)
  const stressors = computeTagFrequency(logs).slice(0, 5)
  const mood = mostCommon(logs.map(l => l.mood)) || 'neutral'
  const hasSchool = logs.some(l => l.eventCategories?.includes('school'))
  const band = stressLevelLabel(avgStress).toLowerCase()

  const pattern = hasSchool
    ? `Busy load: ${mood} mood with ${band} stress suggests a steady but effort-heavy school day.`
    : `${mood.charAt(0).toUpperCase() + mood.slice(1)} mood with ${band} stress.`

  return { stress: stressLevelLabel(avgStress), energy: energyLevelLabel(avgEnergy), sleep: sleepSummaryLabel(logs), stabilityPct: stability.percentage, stabilityLabel: stability.label, pattern, topStressors: stressors }
}

// MAIN HOOK

export function useJournalAnalytics() {
  const { user } = useAuth()
  const [allLogs, setAllLogs] = useState<MoodLogEntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [timeView, setTimeView] = useState<'today' | '7days'>('today')
  const [stabilityRange, setStabilityRange] = useState<'7days' | '30days'>('7days')
  const [stabilityMetric, setStabilityMetric] = useState<'stress' | 'energy'>('stress')

  useEffect(() => { if (user?.id) loadData() }, [user?.id])

  const loadData = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const start = new Date(); start.setDate(start.getDate() - 30)
      const end = new Date(); end.setHours(23, 59, 59, 999)
      const logs = await moodService.getMoodLogs(user.id, start.toISOString(), end.toISOString())
      setAllLogs(Array.isArray(logs) ? logs : [])
    } catch { setAllLogs([]) }
    finally { setLoading(false) }
  }

  const todayStr = toLocalDateStr(new Date())

  const todayLogs = useMemo(() => allLogs.filter(l => {
    const t = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
    return toLocalDateStr(t) === todayStr
  }), [allLogs, todayStr])

  const weekLogs = useMemo(() => filterLogsToLast7CalendarDays(allLogs), [allLogs])

  // Today
  const todayMood = useMemo(() => mostCommon(todayLogs.map(l => l.mood)) || null, [todayLogs])
  const todayAvgIntensity = useMemo(() => todayLogs.length ? Math.round((todayLogs.reduce((s, l) => s + l.intensity, 0) / todayLogs.length) * 10) / 10 : 0, [todayLogs])
  const todayStability = useMemo(() => computeStability(todayLogs), [todayLogs])
  const todayInsight = useMemo(() => computeInsight(todayLogs), [todayLogs])
  const todaySignals = useMemo(() => computeSignals(todayLogs), [todayLogs])
  const todayTopStressors = useMemo(() => computeTagFrequency(todayLogs).slice(0, 5), [todayLogs])
  const todayEventFocus = useMemo(() => { const c = computeCategoryFrequency(todayLogs); return c.length > 0 ? c[0] : null }, [todayLogs])
  const todayCategoryBreakdown = useMemo(() => computeCategoryFrequency(todayLogs), [todayLogs])

  const todayMoodCharts = useMemo(() => {
    const { startMs, endMs } = localDayBoundsMs(new Date())
    return buildMoodChartAggregates(todayLogs, startMs, endMs)
  }, [todayLogs])

  const todayFrequencySegments = useMemo(
    () =>
      todayMoodCharts.byMood
        .filter((x) => x.count > 0)
        .map((x) => ({
          label: x.label,
          mood: x.mood,
          value: x.count,
          color: x.color,
          hint: `${x.count} check-in${x.count === 1 ? '' : 's'}`,
        })),
    [todayMoodCharts],
  )

  const todayDurationBars = useMemo(
    () =>
      [...todayMoodCharts.byMood]
        .filter((x) => x.totalMinutes > 0)
        .sort((a, b) => b.totalMinutes - a.totalMinutes || b.count - a.count),
    [todayMoodCharts],
  )

  const todayIntensityBars = useMemo(
    () =>
      [...todayMoodCharts.byMood]
        .filter((x) => x.intensitySamples > 0)
        .sort(
          (a, b) =>
            b.averageIntensity - a.averageIntensity ||
            b.intensitySamples - a.intensitySamples,
        ),
    [todayMoodCharts],
  )

  // 7 Days
  const daysLogged = useMemo(() => new Set(weekLogs.map(l => { const t = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp); return toLocalDateStr(t) })).size, [weekLogs])
  const streak = useMemo(() => computeStreak(allLogs), [allLogs])
  const weekAvgMood = useMemo(() => mostCommon(weekLogs.map(l => l.mood)) || null, [weekLogs])
  const weekTrendLabel = useMemo(() => computeTrendLabel(weekLogs), [weekLogs])
  const weekStability = useMemo(() => computeStability(weekLogs), [weekLogs])
  const monthStability = useMemo(() => computeStability(allLogs), [allLogs])
  const dailyStress7 = useMemo(() => computeDailyMetric(allLogs, 'stress', 7, stressBarColor), [allLogs])
  const dailyEnergy7 = useMemo(() => computeDailyMetric(allLogs, 'energy', 7, energyBarColor), [allLogs])
  const dailyStress30 = useMemo(() => computeDailyMetric(allLogs, 'stress', 30, stressBarColor), [allLogs])
  const dailyEnergy30 = useMemo(() => computeDailyMetric(allLogs, 'energy', 30, energyBarColor), [allLogs])
  const weekSummary = useMemo(() => computeWeekSummary(weekLogs), [weekLogs])

  const weekMoodCharts = useMemo(() => {
    const { startMs, endMs } = rollingSevenDayRangeMs()
    return buildMoodChartAggregates(weekLogs, startMs, endMs)
  }, [weekLogs])

  const weekFrequencySegments = useMemo(
    () =>
      weekMoodCharts.byMood
        .filter((x) => x.count > 0)
        .map((x) => ({
          label: x.label,
          mood: x.mood,
          value: x.count,
          color: x.color,
          hint: `${x.count} check-in${x.count === 1 ? '' : 's'}`,
        })),
    [weekMoodCharts],
  )

  const weekDurationBars = useMemo(
    () =>
      [...weekMoodCharts.byMood]
        .filter((x) => x.totalMinutes > 0)
        .sort((a, b) => b.totalMinutes - a.totalMinutes || b.count - a.count),
    [weekMoodCharts],
  )

  const weekIntensityBars = useMemo(
    () =>
      [...weekMoodCharts.byMood]
        .filter((x) => x.intensitySamples > 0)
        .sort(
          (a, b) =>
            b.averageIntensity - a.averageIntensity ||
            b.intensitySamples - a.intensitySamples,
        ),
    [weekMoodCharts],
  )

  return {
    loading, timeView, setTimeView, stabilityRange, setStabilityRange, stabilityMetric, setStabilityMetric,
    todayLogs, todayMood, todayAvgIntensity, todayCheckIns: todayLogs.length,
    todayStability, todayInsight, todaySignals, todayTopStressors, todayEventFocus, todayCategoryBreakdown,
    todayMoodCharts,
    todayFrequencySegments,
    todayDurationBars,
    todayIntensityBars,
    weekLogs, daysLogged, weekCheckIns: weekLogs.length, streak, weekAvgMood, weekTrendLabel,
    weekStability, monthStability,
    dailyStress: stabilityRange === '7days' ? dailyStress7 : dailyStress30,
    dailyEnergy: stabilityRange === '7days' ? dailyEnergy7 : dailyEnergy30,
    weekSummary,
    weekMoodCharts,
    weekFrequencySegments,
    weekDurationBars,
    weekIntensityBars,
  }
}

export type JournalAnalyticsModel = ReturnType<typeof useJournalAnalytics>