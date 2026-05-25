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
  return { summary: buildTemplatePeriodSummary(data), source: 'fallback' }
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
