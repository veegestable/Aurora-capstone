import { httpsCallable } from 'firebase/functions'
import { functions } from '../config/firebase'
import type { MoodLogEntryRow } from './mood/types'
import {
  buildPeriodSummaryInput,
  buildTemplatePeriodSummary,
  type PeriodSummaryInput,
} from '../utils/analytics/periodSummaryInput'

export type WeeklySummaryResult = {
  summary: string
  source: 'ai' | 'fallback'
}

export async function generateWeeklySummary(
  data: PeriodSummaryInput,
): Promise<WeeklySummaryResult> {
  const fallback = buildTemplatePeriodSummary(data)

  try {
    const callable = httpsCallable<PeriodSummaryInput, { summary?: string; fromAi?: boolean }>(
      functions,
      'generateWeeklySummaryAi',
    )
    const resp = await callable(data)
    const text = resp.data?.summary?.trim()
    if (!text) return { summary: fallback, source: 'fallback' }
    return { summary: text, source: resp.data?.fromAi ? 'ai' : 'fallback' }
  } catch {
    return { summary: fallback, source: 'fallback' }
  }
}

export function buildWeekSummaryInputFromLogs(
  logs: MoodLogEntryRow[],
  weekLabel = 'this week',
): PeriodSummaryInput {
  return buildPeriodSummaryInput(logs, 7, weekLabel)
}

export function buildMonthSummaryInputFromLogs(
  logs: MoodLogEntryRow[],
): PeriodSummaryInput {
  return buildPeriodSummaryInput(logs, 30, 'the last 30 days')
}
