import { useMemo, useState } from 'react'
import { HelpCircle, Sparkles } from 'lucide-react'
import type { MoodLogEntryRow } from '../../services/mood/types'
import type { DayBar } from '../../types/journalAnalytics.types'
import { computeStability, filterLogsForStabilityWindow } from '../../utils/analytics/computeStability'
import {
  energyCategoryLabelFromFive,
  stressCategoryLabelFromFive,
} from '../../utils/analytics/metricCategories'
import { calendarDayKeyLocal } from '../../utils/analytics/dateKeys'

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

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

function computeDailyMetric(
  logs: MoodLogEntryRow[],
  field: 'stress' | 'energy',
  days: number,
  colorFn: (avg: number) => string,
): DayBar[] {
  const today = new Date()
  const bars: DayBar[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = toLocalDateStr(d)
    const dayLogs = logs.filter((l) => {
      const lt = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
      return toLocalDateStr(lt) === key
    })
    const avg =
      dayLogs.length > 0
        ? dayLogs.reduce((s, l) => s + l[field], 0) / dayLogs.length
        : 0
    bars.push({
      dayLabel: getDayLabel(d),
      avg: Math.round(avg * 10) / 10,
      color: dayLogs.length > 0 ? colorFn(avg) : '#334155',
      hasData: dayLogs.length > 0,
    })
  }
  return bars
}

type Props = {
  logs: MoodLogEntryRow[]
  periodDays: 7 | 30
}

/** Stress/energy stability + daily bars for counselor special-population analytics. */
export function CounselorStudentWellnessTrends({ logs, periodDays }: Props) {
  const [stabilityMetric, setStabilityMetric] = useState<'stress' | 'energy'>('stress')

  const logsForStability = useMemo(
    () => filterLogsForStabilityWindow(logs, periodDays),
    [logs, periodDays],
  )

  const stability = useMemo(
    () => computeStability(logsForStability),
    [logsForStability],
  )

  const dailyStress = useMemo(
    () => computeDailyMetric(logs, 'stress', periodDays, stressBarColor),
    [logs, periodDays],
  )
  const dailyEnergy = useMemo(
    () => computeDailyMetric(logs, 'energy', periodDays, energyBarColor),
    [logs, periodDays],
  )

  const bars = stabilityMetric === 'stress' ? dailyStress : dailyEnergy
  const chartScrollsHorizontally = bars.length > 7

  const last30LoggedDayCount = useMemo(() => {
    if (periodDays !== 30) return 0
    const keys = new Set<string>()
    for (const log of logs) {
      const t = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp)
      keys.add(calendarDayKeyLocal(t))
    }
    return keys.size
  }, [logs, periodDays])

  const last30AvgStress = useMemo(() => {
    const withData = dailyStress.filter((b) => b.hasData)
    if (!withData.length) return 0
    return withData.reduce((s, b) => s + b.avg, 0) / withData.length
  }, [dailyStress])

  const last30AvgEnergy = useMemo(() => {
    const withData = dailyEnergy.filter((b) => b.hasData)
    if (!withData.length) return 0
    return withData.reduce((s, b) => s + b.avg, 0) / withData.length
  }, [dailyEnergy])

  if (logs.length === 0) return null

  return (
    <div className="card-aurora space-y-5 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        <p className="text-[10px] font-bold tracking-widest text-white uppercase">Mood stability</p>
        <HelpCircle className="h-4 w-4 shrink-0 text-aurora-text-muted" aria-hidden />
      </div>

      <div className="rounded-xl border border-white/5 bg-white/5 p-5">
        <p
          className={`mb-1 text-4xl font-extrabold tabular-nums ${
            periodDays === 30 ? 'text-amber-300' : 'text-white'
          }`}
        >
          {stability.percentage}%
        </p>
        <p className="text-sm font-bold text-white">Stability score</p>
        <p className="mt-1 text-xs text-aurora-text-sec">{stability.label}</p>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold tracking-widest text-white uppercase">
          {stabilityMetric === 'stress' ? 'Stress trend' : 'Energy trend'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStabilityMetric('stress')}
          className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all ${
            stabilityMetric === 'stress'
              ? 'bg-aurora-purple text-white'
              : 'text-aurora-text-sec hover:text-white'
          }`}
        >
          Stress
        </button>
        <button
          type="button"
          onClick={() => setStabilityMetric('energy')}
          className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all ${
            stabilityMetric === 'energy'
              ? 'bg-aurora-purple text-white'
              : 'text-aurora-text-sec hover:text-white'
          }`}
        >
          Energy
        </button>
      </div>

      <div
        className={
          chartScrollsHorizontally
            ? 'overflow-x-auto pb-2 md:overflow-x-visible [-webkit-overflow-scrolling:touch]'
            : undefined
        }
      >
        <div
          className={`flex h-40 gap-2 ${
            chartScrollsHorizontally ? 'min-w-max w-max md:min-w-0 md:w-full' : 'w-full'
          }`}
        >
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`group flex flex-col items-center gap-2 ${
                chartScrollsHorizontally
                  ? 'w-8 shrink-0 md:w-auto md:min-w-0 md:flex-1'
                  : 'min-w-0 flex-1'
              }`}
            >
              <div className="relative flex h-full w-full flex-1 items-end justify-center">
                {bar.hasData ? (
                  <div className="relative flex h-full w-full items-end justify-center">
                    <div
                      className="max-w-[36px] w-full rounded-t-lg opacity-85 transition-all duration-500 group-hover:opacity-100"
                      style={{ height: `${(bar.avg / 5) * 100}%`, backgroundColor: bar.color }}
                    />
                  </div>
                ) : (
                  <div className="h-2 w-full max-w-[36px] rounded-full bg-white/10" />
                )}
              </div>
              <span className="text-[10px] font-bold text-aurora-text-sec">{bar.dayLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {periodDays === 30 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <div className="rounded-full border border-[rgba(91,117,255,0.3)] bg-[rgba(91,117,255,0.16)] px-2.5 py-1.5">
            <p className="text-[11px] font-bold text-white">
              {last30LoggedDayCount > 0
                ? `${last30LoggedDayCount}/30 logged`
                : 'No check-ins in the last 30 days yet'}
            </p>
          </div>
          {last30LoggedDayCount > 0 ? (
            <div className="rounded-full border border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.18)] px-2.5 py-1.5">
              <p className="text-[11px] font-bold text-white">
                {stabilityMetric === 'stress'
                  ? `Stress level: ${stressCategoryLabelFromFive(last30AvgStress)}`
                  : `Energy level: ${energyCategoryLabelFromFive(last30AvgEnergy)}`}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
