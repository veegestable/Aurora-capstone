import { HelpCircle, Sparkles, TrendingUp } from 'lucide-react'
import { JournalMoodChartsSection } from '../JournalMoodChartsSection'
import { ProgressBarList } from '../ProgressBarList'
import type { JournalAnalyticsSceneProps } from './journalAnalyticsTypes'
import {
  energyCategoryLabelFromFive,
  stressCategoryLabelFromFive,
} from '../../../utils/analytics/metricCategories'

export function JournalAnalyticsWeekView({
  a,
  chartMood,
  onSelectChartMood,
  donutCenterLabel,
  chartGuides,
}: JournalAnalyticsSceneProps) {
  const stability = a.stabilityRange === '7days' ? a.weekStability : a.monthStability
  const bars = a.stabilityMetric === 'stress' ? a.dailyStress : a.dailyEnergy

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-2xl font-bold text-white">Your last 7 days</h3>
        <p className="mt-1 text-sm text-aurora-text-sec">Quick mood highlights from your last 7 days.</p>
        <p className="mt-0.5 text-xs text-aurora-text-muted">
          Nothing here diagnoses you or guesses what comes next.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card-aurora p-4">
          <p className="mb-1 text-[10px] font-bold tracking-widest text-aurora-text-sec uppercase">Days Logged</p>
          <p className="text-3xl font-extrabold text-white">
            {a.daysLogged}
            <span className="text-base font-bold text-aurora-text-sec">/7</span>
          </p>
        </div>
        <div className="card-aurora p-4">
          <p className="mb-1 text-[10px] font-bold tracking-widest text-aurora-text-sec uppercase">Check-ins</p>
          <p className="text-3xl font-extrabold text-white">{a.weekCheckIns}</p>
        </div>
        <div className="card-aurora p-4">
          <p className="mb-1 text-[10px] font-bold tracking-widest text-aurora-text-sec uppercase">Streak</p>
          <p className="text-3xl font-extrabold text-white">{a.streak}</p>
        </div>
      </div>

      <p className="text-xs text-aurora-text-muted">Based on your last 7 days of check-ins.</p>

      <div className="rounded-2xl border border-aurora-blue/35 bg-linear-to-br from-[#1a1a2e] to-[#0f0f1a] p-6 shadow-[0_0_24px_rgba(45,107,255,0.12)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-aurora-text-sec" aria-hidden />
            <p className="text-[10px] font-bold tracking-widest text-white uppercase">Average mood</p>
          </div>
          {a.weekAvgMood ? (
            <span className="rounded-full border border-aurora-blue/40 bg-[rgba(45,107,255,0.15)] px-3 py-1 text-xs font-bold capitalize text-white">
              {a.weekAvgMood}
            </span>
          ) : null}
        </div>
        <h4 className="text-2xl leading-tight font-extrabold text-white sm:text-3xl">
          Mood trend: {a.weekTrendLabel}
        </h4>
      </div>

      <div className="card-aurora space-y-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
            <p className="text-[10px] font-bold tracking-widest text-white uppercase">Mood stability</p>
            <HelpCircle className="h-4 w-4 shrink-0 text-aurora-text-muted" aria-hidden />
          </div>
          <div className="flex shrink-0 rounded-full border border-white/5 bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => a.setStabilityRange('7days')}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-all ${
                a.stabilityRange === '7days'
                  ? 'bg-aurora-purple text-white'
                  : 'text-aurora-text-sec hover:text-white'
              }`}
            >
              7 days
            </button>
            <button
              type="button"
              onClick={() => a.setStabilityRange('30days')}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-all ${
                a.stabilityRange === '30days'
                  ? 'bg-aurora-purple text-white'
                  : 'text-aurora-text-sec hover:text-white'
              }`}
            >
              30 days
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/5 p-5">
          <p
            className={`mb-1 text-4xl font-extrabold tabular-nums ${
              a.stabilityRange === '30days' ? 'text-amber-300' : 'text-white'
            }`}
          >
            {stability.percentage}%
          </p>
          <p className="text-sm font-bold text-white">Stability score</p>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold tracking-widest text-white uppercase">
            {a.stabilityMetric === 'stress' ? 'Stress trend' : 'Energy trend'}
          </p>
          <HelpCircle className="h-4 w-4 text-aurora-text-muted" aria-hidden />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => a.setStabilityMetric('stress')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all ${
              a.stabilityMetric === 'stress'
                ? 'bg-aurora-purple text-white'
                : 'text-aurora-text-sec hover:text-white'
            }`}
          >
            🔥 Stress
          </button>
          <button
            type="button"
            onClick={() => a.setStabilityMetric('energy')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all ${
              a.stabilityMetric === 'energy'
                ? 'bg-aurora-purple text-white'
                : 'text-aurora-text-sec hover:text-white'
            }`}
          >
            🔋 Energy
          </button>
        </div>

        <div className="flex h-40 gap-2">
          {bars.map((bar, i) => (
            <div key={i} className="group flex flex-1 flex-col items-center gap-2">
              <div className="relative flex flex-1 w-full items-end justify-center">
                {bar.hasData ? (
                  <div className="relative flex h-full w-full cursor-pointer items-end justify-center">
                    <div
                      className="max-w-[36px] w-full rounded-t-lg opacity-85 transition-all duration-500 group-hover:scale-x-110 group-hover:opacity-100"
                      style={{ height: `${(bar.avg / 5) * 100}%`, backgroundColor: bar.color }}
                    />
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div className="rounded-xl border border-white/10 bg-[#1a1a2e] px-3 py-2 shadow-xl whitespace-nowrap">
                        <div className="mb-1 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: bar.color }} />
                          <span className="text-xs font-bold text-white">{bar.dayLabel}</span>
                        </div>
                        <p className="text-[10px] font-semibold text-aurora-text-sec">
                          {a.stabilityMetric === 'stress' ? '🔥' : '🔋'} Avg {a.stabilityMetric}:{' '}
                          {bar.avg}/5
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[36px] h-2 w-full rounded-full bg-white/10" />
                )}
              </div>
              <span className="text-[10px] font-bold text-aurora-text-sec">{bar.dayLabel}</span>
            </div>
          ))}
        </div>

        {a.stabilityRange === '30days' ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <div
              className="rounded-full border border-[rgba(91,117,255,0.3)] px-2.5 py-1.5"
              style={{ backgroundColor: 'rgba(91, 117, 255, 0.16)' }}
            >
              <p className="text-[11px] font-bold text-white">
                {a.last30LoggedDayCount > 0
                  ? `${a.last30LoggedDayCount}/30 logged`
                  : 'No check-ins in the last 30 days yet'}
              </p>
            </div>
            {a.last30LoggedDayCount > 0 ? (
              <div
                className="rounded-full border border-[rgba(124,58,237,0.35)] px-2.5 py-1.5"
                style={{ backgroundColor: 'rgba(124, 58, 237, 0.18)' }}
              >
                <p className="text-[11px] font-bold text-white">
                  {a.stabilityMetric === 'stress'
                    ? `Stress level: ${stressCategoryLabelFromFive(a.last30AvgStressAmongLoggedDays)}`
                    : `Energy level: ${energyCategoryLabelFromFive(a.last30AvgEnergyAmongLoggedDays)}`}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <JournalMoodChartsSection
        frequencySegments={a.weekFrequencySegments}
        totalCheckIns={a.weekMoodCharts.totalCheckIns}
        donutCenterLabel={donutCenterLabel}
        chartMood={chartMood}
        onSelectChartMood={onSelectChartMood}
        durationBars={a.weekDurationBars}
        durationEmptyMessage="No duration entries yet for the last 7 days."
        intensityBars={a.weekIntensityBars}
        intensityEmptyMessage="No intensity entries yet for the last 7 days."
        chartGuides={chartGuides}
      />

      <div className="rounded-2xl border border-aurora-blue/30 bg-linear-to-br from-[rgba(45,107,255,0.08)] to-[rgba(124,58,237,0.05)] p-6 shadow-[0_0_20px_rgba(45,107,255,0.08)]">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-aurora-blue" aria-hidden />
          <h4 className="text-lg font-bold text-white">Written summary for the last 7 days</h4>
        </div>
        <p className="mb-5 text-xs text-aurora-text-sec">
          Nothing here diagnoses you or guesses what comes next.
        </p>

        <div className="mb-5 space-y-2">
          <p className="text-sm text-white">
            <span className="font-bold">Stress:</span> {a.weekSummary.stress}
          </p>
          <p className="text-sm text-white">
            <span className="font-bold">Energy:</span> {a.weekSummary.energy}
          </p>
          <p className="text-sm text-white">
            <span className="font-bold">Sleep:</span> {a.weekSummary.sleep}
          </p>
          <p className="text-sm text-white">
            <span className="font-bold">Mood stability:</span> {a.weekSummary.stabilityPct}%
          </p>
        </div>

        <p className="mb-5 text-sm text-white">
          <span className="font-bold">Academic pattern:</span> {a.weekSummary.pattern}
        </p>

        {a.weekSummary.topStressors.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="mb-1 text-[10px] font-bold tracking-widest text-aurora-purple uppercase">
              Top academic activities
            </p>
            <p className="mb-3 text-[10px] text-aurora-text-muted">Counts from tagged check-ins this week.</p>
            <ProgressBarList
              items={a.weekSummary.topStressors.map((s) => ({ label: s.tag, count: s.count }))}
              barColor="bg-aurora-blue"
              labelColor="text-white"
            />
          </div>
        )}
      </div>
    </div>
  )
}