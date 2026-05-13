import { useEffect, useMemo, useState } from 'react'
import { useJournalAnalytics } from '../../hooks/useJournalAnalytics'
import {
  GUIDE_MOOD_DURATION,
  GUIDE_MOOD_FREQUENCY_TODAY,
  GUIDE_MOOD_FREQUENCY_WEEK,
  GUIDE_MOOD_INTENSITY,
} from '../../constants/mood/journalAnalyticsGuideCopy'
import { AnalyticsInfoModal } from './AnalyticsInfoModal'
import { JournalAnalyticsTodayView } from './analytics/JournalAnalyticsTodayView'
import { JournalAnalyticsWeekView } from './analytics/JournalAnalyticsWeekView'

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

  const openFrequencyGuideToday = () =>
    setGuide({ title: 'Mood frequency', body: GUIDE_MOOD_FREQUENCY_TODAY })
  const openFrequencyGuideWeek = () =>
    setGuide({ title: 'Mood frequency', body: GUIDE_MOOD_FREQUENCY_WEEK })
  const openDurationGuide = () => setGuide({ title: 'Mood duration', body: GUIDE_MOOD_DURATION })
  const openIntensityGuide = () =>
    setGuide({ title: 'Average intensity', body: GUIDE_MOOD_INTENSITY })

  if (a.loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-aurora-blue border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex w-fit rounded-full border border-white/5 bg-aurora-bg/50 p-1">
        <button
          type="button"
          onClick={() => a.setTimeView('today')}
          className={`cursor-pointer rounded-full px-6 py-2 text-sm font-bold transition-all ${
            a.timeView === 'today'
              ? 'bg-aurora-purple text-white shadow-md'
              : 'text-aurora-text-sec hover:text-white'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => a.setTimeView('7days')}
          className={`cursor-pointer rounded-full px-6 py-2 text-sm font-bold transition-all ${
            a.timeView === '7days'
              ? 'bg-aurora-purple text-white shadow-md'
              : 'text-aurora-text-sec hover:text-white'
          }`}
        >
          7 days
        </button>
      </div>

      <p className="text-xs text-aurora-text-muted">
        Updated{' '}
        {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </p>

      {a.timeView === 'today' ? (
        <JournalAnalyticsTodayView
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
        <JournalAnalyticsWeekView
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