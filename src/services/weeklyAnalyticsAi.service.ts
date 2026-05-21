/**
 * Weekly analytics narrative — server-side via Cloud Function (mobile parity).
 */

import { httpsCallable } from 'firebase/functions'
import { functions } from '../config/firebase'
import { moodService } from './mood'
import {
  buildLast7DaysPayload,
  summarizeWeekSeries,
  type WeeklySeriesPayload,
} from '../utils/analytics/weeklySeries'

export const WEEKLY_SUMMARY_FALLBACK_STUDENT_INTRO =
  "Your weekly summary is taking a moment. Here's a quick overview based on your logs."

export type WeeklyTrend = 'Improving' | 'Declining' | 'Stable'

export interface WeeklyAiResult {
  trend: WeeklyTrend
  summary: string
  observations: string[]
  recommendations: string[]
  support_note: string
  fromAi: boolean
}

export function deterministicWeeklyFallback(payload: WeeklySeriesPayload): WeeklyAiResult {
  const moods = payload.daily_mood
    .map((m, i) => (m >= 1 && m <= 5 ? { m, i } : null))
    .filter(Boolean) as { m: number; i: number }[]
  let trend: WeeklyTrend = 'Stable'
  if (moods.length >= 4) {
    const mid = Math.floor(moods.length / 2)
    const first = moods.slice(0, mid)
    const second = moods.slice(mid)
    const a1 = first.reduce((s, x) => s + x.m, 0) / first.length
    const a2 = second.reduce((s, x) => s + x.m, 0) / second.length
    if (a2 - a1 >= 0.35) trend = 'Improving'
    else if (a1 - a2 >= 0.35) trend = 'Declining'
  }

  const { avgMood, dominantStress, totalTasks } = summarizeWeekSeries(payload)
  const daysWithCheckIn = payload.daily_mood.filter((m) => m >= 1 && m <= 5).length
  const lowMoodDays = payload.daily_mood.filter((m) => m >= 1 && m <= 2).length
  const highStressDays = payload.daily_stress.filter((s) => s === 'High').length

  const summaryParts: string[] = []
  if (daysWithCheckIn === 0) {
    summaryParts.push('No check-ins were recorded in this window.')
  } else {
    if (avgMood != null)
      summaryParts.push(`Average mood scale was about ${avgMood.toFixed(1)} (1–5).`)
    if (dominantStress !== '—')
      summaryParts.push(`Recorded stress levels were most often ${dominantStress}.`)
    summaryParts.push(`${daysWithCheckIn} day(s) included a check-in.`)
  }

  const observations: string[] = []
  if (daysWithCheckIn > 0) {
    if (totalTasks === 0) {
      observations.push('No tasks were listed on your check-ins this week.')
    } else {
      observations.push(
        `You listed ${totalTasks} task${totalTasks === 1 ? '' : 's'} across your check-ins this week.`,
      )
    }
    if (dominantStress === 'Low') {
      observations.push('Most of your logged days looked calmer on the Stress Index.')
    } else if (dominantStress === 'Moderate') {
      observations.push('Most logged days sat in the middle on the Stress Index.')
    } else if (dominantStress === 'High') {
      observations.push('Several logged days showed a higher Stress Index.')
    } else {
      observations.push('Keep logging a few more days to see a clearer Stress Index pattern.')
    }
  } else {
    observations.push('No check-ins in this window yet — your summary will fill in as you log.')
  }

  const recommendations: string[] = [
    'Consider short breaks between study blocks when your schedule feels full.',
    'Use a simple list to spread tasks across the week when possible.',
  ]

  let support_note = ''
  if (lowMoodDays >= 2 || highStressDays >= 2) {
    support_note =
      'If you would like support, you can reach out to a guidance counselor through the app.'
  }

  return {
    trend,
    summary:
      summaryParts.join(' ') ||
      'Weekly data was limited; keep logging to see clearer patterns.',
    observations,
    recommendations,
    support_note,
    fromAi: false,
  }
}

export async function getLast7Days(userId: string): Promise<WeeklySeriesPayload> {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 21)
  const logs = await moodService.getMoodLogs(userId, start.toISOString(), end.toISOString())
  return buildLast7DaysPayload(Array.isArray(logs) ? logs : [])
}

export async function fetchWeeklyAiAnalyticsWithPayload(
  weeklyData: WeeklySeriesPayload,
): Promise<WeeklyAiResult> {
  try {
    const callable = httpsCallable<{ weeklyData: WeeklySeriesPayload }, WeeklyAiResult>(
      functions,
      'generateWeeklyAnalyticsAi',
    )
    const resp = await callable({ weeklyData })
    const data = resp.data
    if (
      data &&
      (data.trend === 'Improving' || data.trend === 'Declining' || data.trend === 'Stable') &&
      typeof data.summary === 'string'
    ) {
      return {
        trend: data.trend,
        summary: data.summary,
        observations: Array.isArray(data.observations)
          ? data.observations.filter((x) => typeof x === 'string')
          : [],
        recommendations: Array.isArray(data.recommendations)
          ? data.recommendations.filter((x) => typeof x === 'string')
          : [],
        support_note: typeof data.support_note === 'string' ? data.support_note : '',
        fromAi: data.fromAi === true,
      }
    }
  } catch (e) {
    console.warn('[weeklyAnalyticsAi] Cloud Function unavailable', e)
  }
  return deterministicWeeklyFallback(weeklyData)
}

export async function fetchWeeklyAiAnalytics(userId: string): Promise<WeeklyAiResult> {
  const weeklyData = await getLast7Days(userId)
  return fetchWeeklyAiAnalyticsWithPayload(weeklyData)
}
