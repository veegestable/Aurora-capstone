import { HelpCircle, Sparkles, TrendingUp } from 'lucide-react'
import { getEmotionColor } from '../../../utils/moodColors'
import { JournalMoodChartsSection } from '../JournalMoodChartsSection'
import { ProgressBarList } from '../ProgressBarList'
import type { JournalAnalyticsSceneProps } from './journalAnalyticsTypes'
import { CATEGORY_EMOJI } from './journalCategoryEmoji'

export function JournalAnalyticsTodayView({
  a,
  chartMood,
  onSelectChartMood,
  donutCenterLabel,
  chartGuides,
}: JournalAnalyticsSceneProps) {
  const moodColor = a.todayMood ? getEmotionColor(a.todayMood) : '#94A3B8'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-2xl font-bold text-white">Today</h3>
        <p className="text-sm text-aurora-text-sec">Focused insights from your current day.</p>
      </div>

      <div className="card-aurora space-y-6 p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="mb-2 text-[10px] font-bold tracking-widest text-aurora-purple uppercase">Today Mood</p>
            <div className="mb-1 flex items-center gap-2">
              <div className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: moodColor }} />
              <span className="text-lg font-bold text-white capitalize">{a.todayMood || 'No data'}</span>
            </div>
            <p className="text-xs text-aurora-text-sec">Avg intensity {a.todayAvgIntensity}/10</p>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold tracking-widest text-aurora-purple uppercase">Check-ins</p>
            <p className="text-4xl font-extrabold text-white">{a.todayCheckIns}</p>
            <p className="text-xs text-aurora-text-sec">today</p>
          </div>
        </div>

        <div className="border-t border-white/5" />

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-aurora-blue" aria-hidden />
            <p className="text-[10px] font-bold tracking-widest text-aurora-purple uppercase">
              Today mood stability
            </p>
            <HelpCircle className="h-3.5 w-3.5 text-aurora-text-muted" aria-hidden />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-aurora-blue tabular-nums">
              {a.todayStability.percentage}%
            </span>
            <span className="text-sm text-aurora-text-sec">based on today&apos;s check-ins</span>
          </div>
        </div>

        <div className="border-t border-white/5" />

        <div>
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-aurora-text-sec" aria-hidden />
            <p className="text-[10px] font-bold tracking-widest text-aurora-purple uppercase">
              Academic analytics
            </p>
            <HelpCircle className="h-3.5 w-3.5 text-aurora-text-muted" aria-hidden />
          </div>
          <p className="mb-4 text-sm leading-relaxed font-bold text-white">{a.todayInsight}</p>

          {a.todaySignals.length > 0 && (
            <>
              <p className="mb-2 text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase">
                Signals
              </p>
              {a.todaySignals.map((sig, i) => (
                <p key={i} className="mb-1 text-sm text-aurora-text-sec">
                  {sig}
                </p>
              ))}
            </>
          )}

          {a.todayTopStressors.length > 0 && (
            <div className="mt-4">
              <p className="mb-3 text-[10px] font-bold tracking-widest text-white uppercase">Top stressors</p>
              <ProgressBarList
                items={a.todayTopStressors.map((s) => ({ label: s.tag, count: s.count }))}
                barColor="bg-aurora-purple"
                labelColor="text-white"
              />
            </div>
          )}
        </div>
      </div>

      {a.todayEventFocus && (
        <div className="card-aurora p-6">
          <p className="mb-3 text-[10px] font-bold tracking-widest text-aurora-purple uppercase">
            Today Event Focus
          </p>
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
            <span className="text-lg">{CATEGORY_EMOJI[a.todayEventFocus.category] || '📋'}</span>
            <div>
              <p className="text-sm font-bold text-white capitalize">{a.todayEventFocus.category}</p>
              <p className="text-[10px] text-aurora-text-sec">Most used category today</p>
            </div>
          </div>
          <ProgressBarList
            items={a.todayCategoryBreakdown.map((c) => ({ label: c.category, count: c.count }))}
            barColor="bg-aurora-amber"
            labelColor="text-aurora-amber"
          />
        </div>
      )}

      <JournalMoodChartsSection
        frequencySegments={a.todayFrequencySegments}
        totalCheckIns={a.todayMoodCharts.totalCheckIns}
        donutCenterLabel={donutCenterLabel}
        chartMood={chartMood}
        onSelectChartMood={onSelectChartMood}
        durationBars={a.todayDurationBars}
        durationEmptyMessage="No duration entries yet for today."
        intensityBars={a.todayIntensityBars}
        intensityEmptyMessage="No intensity entries yet for today."
        chartGuides={chartGuides}
      />

      {a.todayCheckIns < 2 ? (
        <div className="card-aurora p-6">
          <p className="mb-2 text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase">
            Stress &amp; energy trend
          </p>
          <p className="text-sm text-aurora-text-sec">
            Log at least 2 check-ins today to unlock your stress and energy trend graphs.
          </p>
        </div>
      ) : null}
    </div>
  )
}