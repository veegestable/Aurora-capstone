import { useEffect, useMemo, useState } from 'react'
import { useJournalAnalytics } from '../../hooks/useJournalAnalytics'
import { getEmotionColor } from '../../utils/moodColors'
import { HelpCircle, Sparkles, TrendingUp } from 'lucide-react'
import { ProgressBarList } from './ProgressBarList'
import { JournalMoodChartsSection } from './JournalMoodChartsSection'
import {
  GUIDE_MOOD_DURATION,
  GUIDE_MOOD_FREQUENCY_TODAY,
  GUIDE_MOOD_FREQUENCY_WEEK,
  GUIDE_MOOD_INTENSITY,
} from '../../constants/mood/journalAnalyticsGuideCopy'
import { AnalyticsInfoModal } from './AnalyticsInfoModal'

const CATEGORY_EMOJI: Record<string, string> = {
  school: '📚', health: '🏥', social: '👥', fun: '🎮', productivity: '💼',
}

export function AnalyticsTab() {
  const a = useJournalAnalytics()

  const [todayChartMood, setTodayChartMood] = useState<string | null>(null)
  const [weekChartMood, setWeekChartMood] = useState<string | null>(null)
  const [guide, setGuide] = useState<{ title: string; body: string } | null>(null)

  useEffect(() => {
    setTodayChartMood(null)
    setWeekChartMood(null)
  }, [a.timeView])

  const todayDonutCenter = useMemo(() => {
    if (!todayChartMood) return 'check-ins'
    const row = a.todayMoodCharts.byMood.find((x) => x.mood === todayChartMood)
    return row ? `${row.label} selected` : 'check-ins'
  }, [todayChartMood, a.todayMoodCharts.byMood])

  const weekDonutCenter = useMemo(() => {
    if (!weekChartMood) return 'check-ins'
    const row = a.weekMoodCharts.byMood.find((x) => x.mood === weekChartMood)
    return row ? `${row.label} selected` : 'check-ins'
  }, [weekChartMood, a.weekMoodCharts.byMood])

  const openFrequencyGuideToday = () => setGuide({ title: 'Mood frequency', body: GUIDE_MOOD_FREQUENCY_TODAY })
  const openFrequencyGuideWeek = () => setGuide({ title: 'Mood frequency', body: GUIDE_MOOD_FREQUENCY_WEEK })
  const openDurationGuide = () => setGuide({ title: 'Mood duration', body: GUIDE_MOOD_DURATION })
  const openIntensityGuide = () => setGuide({ title: 'Average intensity', body: GUIDE_MOOD_INTENSITY })

  if (a.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-aurora-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Today / 7 Days toggle */}
      <div className="flex bg-aurora-bg/50 p-1 rounded-full border border-white/5 w-fit">
        <button
          onClick={() => a.setTimeView('today')}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
            a.timeView === 'today' ? 'bg-aurora-purple text-white shadow-md' : 'text-aurora-text-sec hover:text-white'
          }`}
        >Today</button>
        <button
          onClick={() => a.setTimeView('7days')}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
            a.timeView === '7days' ? 'bg-aurora-purple text-white shadow-md' : 'text-aurora-text-sec hover:text-white'
          }`}
        >7 days</button>
      </div>

      <p className="text-xs text-aurora-text-muted">
        Updated {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </p>

      {a.timeView === 'today' ? (
        <TodayView
          a={a}
          chartMood={todayChartMood}
          onSelectChartMood={setTodayChartMood}
          donutCenterLabel={todayDonutCenter}
          chartGuides={{
            frequency: openFrequencyGuideToday,
            duration: openDurationGuide,
            intensity: openIntensityGuide,
          }}
        />
      ) : (
        <WeekView
          a={a}
          chartMood={weekChartMood}
          onSelectChartMood={setWeekChartMood}
          donutCenterLabel={weekDonutCenter}
          chartGuides={{
            frequency: openFrequencyGuideWeek,
            duration: openDurationGuide,
            intensity: openIntensityGuide,
          }}
        />
      )}

      <AnalyticsInfoModal
        open={guide !== null}
        title={guide?.title ?? ''}
        body={guide?.body ?? ''}
        onClose={() => setGuide(null)}
      />
    </div>
  )
}

// TODAY VIEW

function TodayView({
  a,
  chartMood,
  onSelectChartMood,
  donutCenterLabel,
  chartGuides
}: {
  a: ReturnType<typeof useJournalAnalytics>
  chartMood: string | null
  onSelectChartMood: (mood: string | null) => void
  donutCenterLabel: string
  chartGuides: {
    frequency: () => void
    duration: () => void
    intensity: () => void
  }
}) {
  const moodColor = a.todayMood ? getEmotionColor(a.todayMood) : '#94A3B8'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-white font-heading">Today</h3>
        <p className="text-sm text-aurora-text-sec">Focused insights from your current day.</p>
      </div>

      {/* Section 3: Today Overview Card */}
      <div className="card-aurora p-6 space-y-6">
        {/* Mood + Check-ins row */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-aurora-purple uppercase mb-2">Today Mood</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: moodColor }} />
              <span className="text-lg font-bold text-white capitalize">{a.todayMood || 'No data'}</span>
            </div>
            <p className="text-xs text-aurora-text-sec">Avg intensity {a.todayAvgIntensity}/10</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-aurora-purple uppercase mb-2">Check-ins</p>
            <p className="text-4xl font-extrabold text-white">{a.todayCheckIns}</p>
            <p className="text-xs text-aurora-text-sec">today</p>
          </div>
        </div>

        <div className="border-t border-white/5" />

        {/* Mood Stability */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-bold tracking-widest text-aurora-purple uppercase">Today Mood Stability</p>
            <HelpCircle className="w-3.5 h-3.5 text-aurora-text-muted" />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-aurora-purple">{a.todayStability.percentage}%</span>
            <span className="text-sm text-aurora-text-sec">based on today's check-ins</span>
          </div>
        </div>

        <div className="border-t border-white/5" />

        {/* Analytics Insight */}
        <div>
          <p className="text-[10px] font-bold tracking-widest text-aurora-purple uppercase mb-1">Analytics (Today)</p>
          <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-2">Insight</p>
          <p className="text-sm font-bold text-white leading-relaxed mb-4">{a.todayInsight}</p>

          {a.todaySignals.length > 0 && (
            <>
              <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-2">Signals</p>
              {a.todaySignals.map((sig, i) => (
                <p key={i} className="text-sm text-aurora-text-sec mb-1">{sig}</p>
              ))}
            </>
          )}

          {a.todayTopStressors.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold tracking-widest text-white uppercase mb-3">Top Stressors</p>
              <ProgressBarList 
                items={a.todayTopStressors.map(s => ({ label: s.tag, count: s.count }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Event Focus */}
      {a.todayEventFocus && (
        <div className="card-aurora p-6">
          <p className="text-[10px] font-bold tracking-widest text-aurora-purple uppercase mb-3">Today Event Focus</p>
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 mb-4">
            <span className="text-lg">{CATEGORY_EMOJI[a.todayEventFocus.category] || '📋'}</span>
            <div>
              <p className="text-sm font-bold text-white capitalize">{a.todayEventFocus.category}</p>
              <p className="text-[10px] text-aurora-text-sec">Most used category today</p>
            </div>
          </div>
          <ProgressBarList
            items={a.todayCategoryBreakdown.map(c => ({ label: c.category, count: c.count }))}
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
    </div>
  )
}

// WEEK VIEW

function WeekView({
  a,
  chartMood,
  onSelectChartMood,
  donutCenterLabel,
  chartGuides,
}: {
  a: ReturnType<typeof useJournalAnalytics>
  chartMood: string | null
  onSelectChartMood: (mood: string | null) => void
  donutCenterLabel: string
  chartGuides: {
    frequency: () => void
    duration: () => void
    intensity: () => void
  }
}) {
  const moodColor = a.weekAvgMood ? getEmotionColor(a.weekAvgMood) : '#94A3B8'
  const stability = a.stabilityRange === '7days' ? a.weekStability : a.monthStability
  const bars = a.stabilityMetric === 'stress' ? a.dailyStress : a.dailyEnergy

  return (
    <div className="space-y-6">
      {/* Section 5: 7-Day Overview */}
      <div>
        <h3 className="text-2xl font-bold text-white font-heading">Your last 7 days</h3>
        <p className="text-sm text-aurora-text-sec mt-1">Quick mood highlights from your last 7 days.</p>
        <p className="text-xs text-aurora-text-muted mt-0.5">Nothing here diagnoses you or guesses what comes next.</p>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-aurora p-4">
          <p className="text-[10px] font-bold tracking-widest text-aurora-text-sec uppercase mb-1">Days Logged</p>
          <p className="text-3xl font-extrabold text-white">{a.daysLogged}<span className="text-base font-bold text-aurora-text-sec">/7</span></p>
        </div>
        <div className="card-aurora p-4">
          <p className="text-[10px] font-bold tracking-widest text-aurora-text-sec uppercase mb-1">Check-ins</p>
          <p className="text-3xl font-extrabold text-white">{a.weekCheckIns}</p>
        </div>
        <div className="card-aurora p-4">
          <p className="text-[10px] font-bold tracking-widest text-aurora-text-sec uppercase mb-1">Streak</p>
          <p className="text-3xl font-extrabold text-white">{a.streak}</p>
        </div>
      </div>

      <p className="text-xs text-aurora-text-muted">Based on your last 7 days of check-ins.</p>

      {/* Average Mood card */}
      <div className="rounded-2xl p-6 border border-white/10 bg-linear-to-br from-[#1a1a2e] to-[#0f0f1a] shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-aurora-text-sec" />
            <p className="text-[10px] font-bold tracking-widest text-aurora-text-sec uppercase">Average Mood (7 Days)</p>
          </div>
          {a.weekAvgMood && (
            <span
              className="text-xs font-bold px-3 py-1 rounded-full capitalize"
              style={{ backgroundColor: `${moodColor}25`, color: moodColor }}
            >{a.weekAvgMood}</span>
          )}
        </div>
        <p className="text-xs text-aurora-purple font-semibold mb-2">Weekly trend</p>
        <h4 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-3">
          Mood trend: {a.weekTrendLabel}
        </h4>
        <p className="text-sm text-aurora-text-sec">Most common mood: <span className="text-white font-semibold capitalize">{a.weekAvgMood || 'N/A'}</span></p>
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

      {/* Section 7: Mood Stability */}
      <div className="card-aurora p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-white">Mood stability</h4>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold tracking-widest text-aurora-text-sec uppercase mr-2">Time Range</span>
            <div className="flex bg-white/5 p-0.5 rounded-full border border-white/5">
              <button
                onClick={() => a.setStabilityRange('7days')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  a.stabilityRange === '7days' ? 'bg-aurora-purple text-white' : 'text-aurora-text-sec hover:text-white'
                }`}
              >7 days</button>
              <button
                onClick={() => a.setStabilityRange('30days')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  a.stabilityRange === '30days' ? 'bg-aurora-purple text-white' : 'text-aurora-text-sec hover:text-white'
                }`}
              >30 days</button>
            </div>
          </div>
        </div>

        {/* Stability score */}
        <div className="bg-white/5 rounded-xl p-5 border border-white/5">
          <p className="text-4xl font-extrabold text-aurora-purple mb-1">{stability.percentage}%</p>
          <p className="text-sm font-bold text-white">Stability score</p>
          <p className="text-xs text-aurora-text-sec mt-1">
            {stability.percentage >= 80 ? 'Very stable — consistent mood patterns.' :
             stability.percentage >= 50 ? 'Mostly stable — a few noticeable shifts.' :
             'Highly variable — significant mood fluctuations.'}
          </p>
        </div>

        {/* Metric toggle */}
        <div>
          <p className="text-[10px] font-bold tracking-widest text-aurora-purple uppercase mb-2">Metric</p>
          <div className="flex gap-2">
            <button
              onClick={() => a.setStabilityMetric('stress')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer border ${
                a.stabilityMetric === 'stress'
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-transparent text-aurora-text-sec hover:text-white'
              }`}
            >😣 Stress</button>
            <button
              onClick={() => a.setStabilityMetric('energy')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer border ${
                a.stabilityMetric === 'energy'
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-transparent text-aurora-text-sec hover:text-white'
              }`}
            >⚡ Energy</button>
          </div>
        </div>

        <p className="text-sm font-semibold text-aurora-text-sec">
          Daily {a.stabilityMetric} trend
        </p>

        {/* Bar chart */}
        <div className="flex gap-2 h-40">
          {bars.map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full relative flex-1 flex items-end justify-center">
                {bar.hasData ? (
                  <div className="relative w-full h-full flex items-end justify-center cursor-pointer">
                    <div
                      className="w-full max-w-[36px] rounded-t-lg transition-all duration-500 group-hover:opacity-100 group-hover:scale-x-110 opacity-85"
                      style={{ height: `${(bar.avg / 5) * 100}%`, backgroundColor: bar.color }}
                    />
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-20">
                      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2 shadow-xl whitespace-nowrap">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bar.color }} />
                          <span className="text-xs font-bold text-white">{bar.dayLabel}</span>
                        </div>
                        <p className="text-[10px] text-aurora-text-sec font-semibold">
                          {a.stabilityMetric === 'stress' ? '😣' : '⚡'} Avg {a.stabilityMetric}: {bar.avg}/5
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-[36px] h-2 rounded-full bg-white/10" />
                )}
              </div>
              <span className="text-[10px] font-bold text-aurora-text-sec">{bar.dayLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 8: Written Summary */}
      <div className="rounded-2xl p-6 border border-aurora-blue/30 bg-linear-to-br from-[rgba(45,107,255,0.08)] to-[rgba(124,58,237,0.05)] shadow-[0_0_20px_rgba(45,107,255,0.08)]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-aurora-blue" />
          <h4 className="text-lg font-bold text-white">Written summary for the last 7 days</h4>
        </div>
        <p className="text-xs text-aurora-text-muted mb-5">Nothing here diagnoses you or guesses what comes next.</p>

        <div className="space-y-2 mb-5">
          <p className="text-sm text-white"><span className="font-bold">Stress:</span> {a.weekSummary.stress}</p>
          <p className="text-sm text-white"><span className="font-bold">Energy:</span> {a.weekSummary.energy}</p>
          <p className="text-sm text-white"><span className="font-bold">Sleep:</span> {a.weekSummary.sleep}</p>
          <p className="text-sm text-white"><span className="font-bold">Mood stability:</span> {a.weekSummary.stabilityPct}%</p>
        </div>

        <p className="text-sm text-white mb-5">
          <span className="font-bold">Pattern:</span> {a.weekSummary.pattern}
        </p>

        {a.weekSummary.topStressors.length > 0 && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-xs font-bold text-white uppercase tracking-widest mb-1">Top Stressors</p>
            <p className="text-[10px] text-aurora-text-muted mb-3">Counts from tagged check-ins this week.</p>
            <ProgressBarList 
              items={a.weekSummary.topStressors.map(s => ({ label: s.tag, count: s.count }))}
            />
          </div>
        )}
      </div>
    </div>
  )
}