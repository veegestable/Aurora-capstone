export interface StabilityMetrics {
  percentage: number
  label: string
}

/** Same formula as `mobile/src/utils/moodAggregates.ts` → `moodStabilityScore`. */
function moodStabilityScoreFromIntensities(intensities: number[]): number {
  if (intensities.length < 2) return 100
  const mean = intensities.reduce((a, b) => a + b, 0) / intensities.length
  const variance =
    intensities.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / intensities.length
  const stdDev = Math.sqrt(variance)
  return Math.round(Math.max(0, 100 - (stdDev / 4.5) * 100))
}

/** Same bands as `mobile/src/components/analytics/AnalyticsMoodWidgets.tsx` → `stabilityCopy`. */
function stabilityLabelFromScore(score: number): string {
  if (score >= 80) return 'Very stable — your mood has been consistent'
  if (score >= 60) return 'Mostly stable — a few noticeable shifts'
  if (score >= 40) return 'Some fluctuation this period'
  return 'High variability — your mood shifted a lot'
}

/** Same intensity rules as `mobile/src/utils/moodEntryNormalize.ts` → `moodDataToMoodEntry`. */
export type LogLikeForStabilityIntensity = {
  intensity?: number
  energy?: number
  energy_level?: number
  emotions?: Array<{ emotion: string; confidence: number; color?: string }>
}

export function analyticsIntensityFromLog(log: LogLikeForStabilityIntensity): number {
  const raw = log as LogLikeForStabilityIntensity & Record<string, unknown>

  const emotionsFromDoc = Array.isArray(raw.emotions)
    ? (raw.emotions as Array<{ emotion: string; confidence: number; color?: string }>)
    : log.emotions

  const primary = emotionsFromDoc?.[0]

  let intensity: number | undefined
  if (typeof raw.intensity === 'number' && Number.isFinite(raw.intensity)) {
    intensity = raw.intensity
  } else if (log.intensity != null && Number.isFinite(log.intensity)) {
    intensity = log.intensity
  }

  if (intensity == null || !Number.isFinite(intensity)) {
    const c = primary?.confidence
    if (typeof c === 'number' && c > 0 && c <= 1) {
      intensity = Math.max(1, Math.min(10, Math.round(c * 10)))
    } else {
      const e =
        (typeof raw.energy_level === 'number' && Number.isFinite(raw.energy_level)
          ? raw.energy_level
          : undefined) ??
        log.energy_level ??
        log.energy ??
        5
      intensity = Math.max(1, Math.min(10, Math.round(Number(e))))
    }
  } else {
    intensity = Math.max(1, Math.min(10, Math.round(intensity)))
  }

  return intensity
}

/**
 * Same time slice as mobile `AnalyticsMoodWidgets` stability block:
 * `end` = local today 23:59:59.999, `start` = `end` minus `daysBack` calendar days.
 */
export function filterLogsForStabilityWindow<
  T extends { timestamp: Date | string },
>(logs: T[], daysBack: 7 | 30): T[] {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - daysBack)
  return logs.filter((l) => {
    const t = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
    return t >= start && t <= end
  })
}

export function computeStability(
  logs: ({ timestamp: Date | string } & LogLikeForStabilityIntensity)[],
): StabilityMetrics {
  const intensities = logs.map((l) => analyticsIntensityFromLog(l))
  const percentage = moodStabilityScoreFromIntensities(intensities)
  return { percentage, label: stabilityLabelFromScore(percentage) }
}