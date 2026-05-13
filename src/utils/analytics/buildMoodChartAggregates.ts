/**
 * Mood frequency / duration / intensity aggregates 
 * adapted for web MoodLogEntryRow (durationMinutes, timestamp).
 */
import type { MoodLogEntryRow } from '../../services/mood/types'
import { getEmotionColor, getEmotionLabel } from '../moodColors'

export type MoodChartAggregateRow = {
  mood: string
  label: string
  color: string
  count: number
  totalMinutes: number
  averageIntensity: number
  intensitySamples: number
}

type MoodEpisode = { startMs: number; endMs: number }

function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMoodKey(log: MoodLogEntryRow): string {
  const raw = typeof log.mood === 'string' ? log.mood : 'neutral'
  return raw.toLowerCase().trim() || 'neutral'
}

function getIntensityFromLog(log: MoodLogEntryRow): number | null {
  const raw = typeof log.intensity === 'number' ? log.intensity : null
  if (raw == null || !Number.isFinite(raw)) return null
  return Math.max(1, Math.min(10, Math.round(raw)))
}

function getDurationMinutesFromLog(log: MoodLogEntryRow): number | null {
  const raw =
    typeof log.durationMinutes === 'number' ? log.durationMinutes : null
  if (raw == null || !Number.isFinite(raw)) return null
  return Math.max(1, Math.min(1440, Math.round(raw)))
}

function mergeEpisodes(episodes: MoodEpisode[]): MoodEpisode[] {
  if (episodes.length <= 1) return episodes
  const sorted = [...episodes].sort((a, b) => a.startMs - b.startMs)
  const merged: MoodEpisode[] = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const previous = merged[merged.length - 1]
    if (current.startMs <= previous.endMs) {
      previous.endMs = Math.max(previous.endMs, current.endMs)
      continue
    }
    merged.push({ ...current })
  }
  return merged
}

/**
 * Same 7 calendar-day window as mobile last7DayKeySet (today .. today-6, anchor at noon).
 */
export function filterLogsToLast7CalendarDays(
  logs: MoodLogEntryRow[],
  now: Date = new Date(),
): MoodLogEntryRow[] {
  const anchor = new Date(now)
  anchor.setHours(12, 0, 0, 0)
  const allowed = new Set<string>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchor)
    d.setDate(d.getDate() - i)
    allowed.add(toLocalDateKey(d))
  }
  return logs.filter((log) => {
    const t = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp)
    return allowed.has(toLocalDateKey(t))
  })
}

/** Mobile weekMoodCharts range: start = local midnight 6 days ago, end = now */
export function rollingSevenDayRangeMs(now: Date = new Date()): {
  startMs: number
  endMs: number
} {
  const end = new Date(now)
  const start = new Date(end)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 6)
  return { startMs: start.getTime(), endMs: end.getTime() }
}

export function buildMoodChartAggregates(
  inputLogs: MoodLogEntryRow[],
  rangeStartMs: number,
  rangeEndMs: number,
): { byMood: MoodChartAggregateRow[]; totalCheckIns: number } {
  if (inputLogs.length === 0) {
    return { byMood: [], totalCheckIns: 0 }
  }

  const moodCount = new Map<string, number>()
  const moodIntensity = new Map<string, { sum: number; n: number }>()
  const moodEpisodes = new Map<string, MoodEpisode[]>()

  for (const log of inputLogs) {
    const moodKey = getMoodKey(log)
    moodCount.set(moodKey, (moodCount.get(moodKey) ?? 0) + 1)

    const intensity = getIntensityFromLog(log)
    if (intensity != null) {
      const prev = moodIntensity.get(moodKey) ?? { sum: 0, n: 0 }
      moodIntensity.set(moodKey, { sum: prev.sum + intensity, n: prev.n + 1 })
    }

    const minutes = getDurationMinutesFromLog(log)
    if (minutes != null) {
      const logTime = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp)
      const endMs = logTime.getTime()
      const startMs = endMs - minutes * 60 * 1000
      const clippedStart = Math.max(startMs, rangeStartMs)
      const clippedEnd = Math.min(endMs, rangeEndMs)
      if (clippedEnd > clippedStart) {
        const list = moodEpisodes.get(moodKey) ?? []
        list.push({ startMs: clippedStart, endMs: clippedEnd })
        moodEpisodes.set(moodKey, list)
      }
    }
  }

  const moodKeys = Array.from(
    new Set([
      ...moodCount.keys(),
      ...moodIntensity.keys(),
      ...moodEpisodes.keys(),
    ]),
  )

  const byMood = moodKeys
    .map((mood) => {
      const episodes = mergeEpisodes(moodEpisodes.get(mood) ?? [])
      const totalMinutes = episodes.reduce(
        (sum, e) => sum + Math.max(0, Math.round((e.endMs - e.startMs) / 60000)),
        0,
      )
      const intensityStats = moodIntensity.get(mood) ?? { sum: 0, n: 0 }
      const averageIntensity =
        intensityStats.n > 0 ? intensityStats.sum / intensityStats.n : 0
      return {
        mood,
        label: getEmotionLabel(mood),
        color: getEmotionColor(mood),
        count: moodCount.get(mood) ?? 0,
        totalMinutes,
        averageIntensity,
        intensitySamples: intensityStats.n,
      }
    })
    .sort((a, b) => b.count - a.count || b.totalMinutes - a.totalMinutes)

  return { byMood, totalCheckIns: inputLogs.length }
}