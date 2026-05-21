import { HelpCircle, Sparkles } from 'lucide-react'
import { JournalMoodChartsSection } from '../JournalMoodChartsSection'
import { ProgressBarList } from '../ProgressBarList'
import type { JournalAnalyticsSceneProps } from './journalAnalyticsTypes'
import {
  energyCategoryLabelFromFive,
  stressCategoryLabelFromFive,
} from '../../../utils/analytics/metricCategories'
import { JournalWeeklyAiInsights } from './JournalWeeklyAiInsights'
import { JournalMostFrequentMoodCard } from './JournalMostFrequentMoodCard'
import { JournalPeriodMetricPills } from './JournalPeriodMetricPills'

type PeriodViewProps = JournalAnalyticsSceneProps & {
  onMostFrequentMoodGuide?: () => void
}

export function JournalAnalyticsWeekView({
  a,
  chartMood,
  onSelectChartMood,
  donutCenterLabel,
  chartGuides,
  onMostFrequentMoodGuide,
}: PeriodViewProps) {
  const stability = a.stabilityRange === '7days' ? a.weekStability : a.monthStability
  const bars = a.stabilityMetric === 'stress' ? a.dailyStress : a.dailyEnergy
  const periodDays = a.periodDays
  const periodTitle = periodDays === 30 ? 'Your last 30 days' : 'Your last 7 days'
  const periodSubtitle =
    periodDays === 30
      ? 'Quick mood highlights from your last 30 days.'
      : 'Quick mood highlights from your last 7 days.'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-2xl font-bold text-white">{periodTitle}</h3>
        <p className="mt-1 text-sm text-aurora-text-sec">{periodSubtitle}</p>
        <p className="mt-0.5 text-xs text-aurora-text-muted">
          Nothing here diagnoses you or guesses what comes next.
        </p>
      </div>

      <JournalPeriodMetricPills
        daysLogged={a.daysLogged}
        periodDays={periodDays}
        checkIns={a.weekCheckIns}
        bestStreak={a.periodHighestStreak}
      />

      {a.weekCheckIns > 0 ? (
        <JournalMostFrequentMoodCard
          display={a.periodDominantMood}
          onGuide={onMostFrequentMoodGuide}
        />
      ) : (
        <div className="card-aurora p-6">
          <p className="text-sm text-aurora-text-sec">
            No check-ins in this window yet. Log your mood to see your most frequent mood here.
          </p>
        </div>
      )}

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
        durationEmptyMessage={`No duration entries yet for the last ${periodDays} days.`}
        intensityBars={a.weekIntensityBars}
        intensityEmptyMessage={`No intensity entries yet for the last ${periodDays} days.`}
        chartGuides={chartGuides}
      />

      <JournalWeeklyAiInsights a={a} />

      <div className="rounded-2xl border border-aurora-blue/30 bg-linear-to-br from-[rgba(45,107,255,0.08)] to-[rgba(124,58,237,0.05)] p-6 shadow-[0_0_20px_rgba(45,107,255,0.08)]">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-aurora-blue" aria-hidden />
          <h4 className="text-lg font-bold text-white">
            Written summary for the last {periodDays} days
          </h4>
        </div>
        <p className="mb-5 text-xs text-aurora-text-sec">
          Nothing here diagnoses you or guesses what comes next.
        </p>

        {a.periodSummaryGenerating ? (
          <p className="mb-4 text-sm italic text-aurora-text-muted">Generating your summary…</p>
        ) : null}
        {a.periodWrittenSummary ? (
          <p className="mb-5 text-sm leading-relaxed text-aurora-text-sec">{a.periodWrittenSummary}</p>
        ) : null}

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