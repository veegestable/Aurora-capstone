import type { MoodLogEntryRow } from '../../services/mood/types'
import { getEmotionColor, getEmotionLabel } from '../moodColors'
import { getMoodIconUrl } from '../moodIconAssets'
import {
  pickDominantMoodFromAggregates,
  type MoodChartAggregateRow,
} from './buildMoodChartAggregates'

export type DominantMoodDisplay = {
  label: string
  iconUrl: string
  accentColor: string
}

function mostCommonMood(logs: MoodLogEntryRow[]): string | null {
  if (!logs.length) return null
  const counts = new Map<string, number>()
  for (const l of logs) {
    const m = (l.mood || 'neutral').toLowerCase()
    counts.set(m, (counts.get(m) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

/** Most frequent mood for summary cards — same rule as mobile Analytics.tsx. */
export function resolveDominantMoodDisplay(
  logs: MoodLogEntryRow[],
  moodCharts: { byMood: MoodChartAggregateRow[] },
): DominantMoodDisplay {
  if (logs.length === 0) {
    return {
      label: 'Not enough check-ins',
      iconUrl: getMoodIconUrl('neutral'),
      accentColor: '#94A3B8',
    }
  }

  const top = pickDominantMoodFromAggregates(moodCharts.byMood)
  if (top) {
    return {
      label: top.label,
      iconUrl: getMoodIconUrl(top.label || top.mood),
      accentColor: top.color ?? getEmotionColor(top.mood),
    }
  }

  const fallbackMood = mostCommonMood(logs)
  if (fallbackMood) {
    const label = getEmotionLabel(fallbackMood)
    return {
      label,
      iconUrl: getMoodIconUrl(label),
      accentColor: getEmotionColor(fallbackMood),
    }
  }

  return {
    label: 'Not enough data',
    iconUrl: getMoodIconUrl('neutral'),
    accentColor: '#94A3B8',
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return `rgba(148, 163, 184, ${alpha})`
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
