import { useEffect, useMemo, useState } from 'react'
import type { MoodLogEntryRow } from '../../services/mood/types'
import { RollingDaysPeriodToggle } from '../analytics/RollingDaysPeriodToggle'
import { JournalPeriodMetricPills } from '../journal/analytics/JournalPeriodMetricPills'
import { JournalMostFrequentMoodCard } from '../journal/analytics/JournalMostFrequentMoodCard'
import { JournalMoodChartsSection } from '../journal/JournalMoodChartsSection'
import { CounselorStudentWellnessTrends } from './CounselorStudentWellnessTrends'
import {
  buildMoodChartAggregates,
  filterLogsToLast30CalendarDays,
  filterLogsToLast7CalendarDays,
  rollingSevenDayRangeMs,
  rollingThirtyDayRangeMs,
} from '../../utils/analytics/buildMoodChartAggregates'
import { calculateHighestCheckInStreakInWindow, calendarDayKeyLocal } from '../../utils/analytics/dateKeys'
import { resolveDominantMoodDisplay } from '../../utils/analytics/dominantMoodDisplay'
import {
  GUIDE_MOOD_DURATION,
  GUIDE_MOOD_INTENSITY,
  guideMoodFrequencyPeriod,
  guideMostFrequentMood,
} from '../../constants/mood/journalAnalyticsGuideCopy'

type Props = {
  logs: MoodLogEntryRow[]
}

/**
 * Counselor read-only analytics — mirrors mobile `CounselorStudentLast7Charts` +
 * `CounselorStudentLast7Highlights` (7 / 30 day toggle, charts, wellness trends).
 */
export function CounselorStudentAnalytics({ logs }: Props) {
  const [periodDays, setPeriodDays] = useState<7 | 30>(7)
  const [chartMood, setChartMood] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState<{ title: string; body: string } | null>(null)

  useEffect(() => {
    setChartMood(null)
  }, [periodDays])

  const periodLogs = useMemo(
    () =>
      periodDays === 30
        ? filterLogsToLast30CalendarDays(logs)
        : filterLogsToLast7CalendarDays(logs),
    [logs, periodDays],
  )

  const periodDayKeySet = useMemo(() => {
    const keys = new Set<string>()
    for (const log of periodLogs) {
      const t = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp)
      keys.add(calendarDayKeyLocal(t))
    }
    return keys
  }, [periodLogs])

  const daysLogged = periodDayKeySet.size
  const checkIns = periodLogs.length

  const bestStreak = useMemo(
    () =>
      calculateHighestCheckInStreakInWindow(
        logs.map((l) => ({
          log_date:
            l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp),
        })),
        periodDays,
      ),
    [logs, periodDays],
  )

  const range =
    periodDays === 30 ? rollingThirtyDayRangeMs() : rollingSevenDayRangeMs()

  const moodCharts = useMemo(
    () => buildMoodChartAggregates(periodLogs, range.startMs, range.endMs),
    [periodLogs, range.startMs, range.endMs],
  )

  const dominantDisplay = useMemo(
    () => resolveDominantMoodDisplay(periodLogs, moodCharts),
    [periodLogs, moodCharts],
  )

  const frequencySegments = useMemo(
    () =>
      moodCharts.byMood
        .filter((x) => x.count > 0)
        .map((x) => ({
          label: x.label,
          mood: x.mood,
          value: x.count,
          color: x.color,
          hint: `${x.count} check-in${x.count === 1 ? '' : 's'}`,
        })),
    [moodCharts.byMood],
  )

  const durationBars = useMemo(
    () =>
      [...moodCharts.byMood]
        .filter((x) => x.totalMinutes > 0)
        .sort((a, b) => b.totalMinutes - a.totalMinutes || b.count - a.count),
    [moodCharts.byMood],
  )

  const intensityBars = useMemo(
    () =>
      [...moodCharts.byMood]
        .filter((x) => x.intensitySamples > 0)
        .sort(
          (a, b) =>
            b.averageIntensity - a.averageIntensity ||
            b.intensitySamples - a.intensitySamples,
        ),
    [moodCharts.byMood],
  )

  const selectedSummary = chartMood
    ? moodCharts.byMood.find((x) => x.mood === chartMood) ?? null
    : null

  const donutCenterLabel = selectedSummary
    ? `${selectedSummary.label} selected`
    : 'check-ins'

  const chartGuides = {
    frequency: () =>
      setGuideOpen({
        title: 'Mood frequency',
        body: guideMoodFrequencyPeriod(periodDays).replace(/\byou\b/gi, 'this student'),
      }),
    duration: () =>
      setGuideOpen({
        title: 'Mood duration',
        body: GUIDE_MOOD_DURATION.replace(/\byou\b/gi, 'the student'),
      }),
    intensity: () =>
      setGuideOpen({
        title: 'Mood intensity',
        body: GUIDE_MOOD_INTENSITY.replace(/\byou\b/gi, 'the student'),
      }),
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RollingDaysPeriodToggle value={periodDays} onChange={setPeriodDays} />
      </div>

      <JournalPeriodMetricPills
        daysLogged={daysLogged}
        periodDays={periodDays}
        checkIns={checkIns}
        bestStreak={bestStreak}
        audience="counselor"
      />

      {checkIns > 0 ? (
        <JournalMostFrequentMoodCard
          display={dominantDisplay}
          onGuide={() =>
            setGuideOpen({
              title: 'Most frequent mood',
              body: guideMostFrequentMood(periodDays).replace(/\bYour\b/g, "This student's"),
            })
          }
        />
      ) : (
        <div className="card-aurora p-4">
          <p className="text-sm text-aurora-text-sec leading-relaxed">
            No mood check-ins in the last {periodDays} days — stability and stress/energy
            trends will appear when this student logs.
          </p>
        </div>
      )}

      {checkIns > 0 ? (
        <>
          <CounselorStudentWellnessTrends logs={periodLogs} periodDays={periodDays} />

          {periodLogs.length === 0 ? null : (
            <JournalMoodChartsSection
              frequencySegments={frequencySegments}
              totalCheckIns={moodCharts.totalCheckIns}
              donutCenterLabel={donutCenterLabel}
              chartMood={chartMood}
              onSelectChartMood={setChartMood}
              durationBars={durationBars}
              durationEmptyMessage="No duration values in this window."
              intensityBars={intensityBars}
              intensityEmptyMessage="No intensity values in this window."
              chartGuides={chartGuides}
            />
          )}
        </>
      ) : null}

      {guideOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setGuideOpen(null)}
        >
          <div
            className="bg-aurora-card border border-aurora-border rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold text-white mb-2">{guideOpen.title}</h3>
            <p className="text-sm text-aurora-text-sec leading-relaxed whitespace-pre-line">
              {guideOpen.body}
            </p>
            <button
              type="button"
              onClick={() => setGuideOpen(null)}
              className="mt-5 w-full py-2.5 rounded-xl border border-aurora-border text-sm font-bold text-white hover:bg-white/5 cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
