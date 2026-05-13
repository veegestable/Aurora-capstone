import { BarChart3, Clock3, HelpCircle, PieChart } from 'lucide-react'
import type { MoodChartAggregateRow } from '../../utils/analytics/buildMoodChartAggregates'
import { ETHICS_ANALYTICS_CHARTS } from '../../constants/mood/journalAnalyticsGuideCopy'
import { MoodFrequencyDonut } from './MoodFrequencyDonut'
import { MoodDurationBars } from './MoodDurationBars'
import { MoodIntensityBars } from './MoodIntensityBars'

export type JournalChartGuides = {
  frequency: () => void
  duration: () => void
  intensity: () => void
}

type FrequencySegment = {
  mood: string
  label: string
  value: number
  color: string
  hint: string
}

type JournalMoodChartsSectionProps = {
  frequencySegments: FrequencySegment[]
  totalCheckIns: number
  donutCenterLabel: string
  chartMood: string | null
  onSelectChartMood: (mood: string | null) => void
  durationBars: MoodChartAggregateRow[]
  durationEmptyMessage: string
  intensityBars: MoodChartAggregateRow[]
  intensityEmptyMessage: string
  chartGuides: JournalChartGuides
}

export function JournalMoodChartsSection({
  frequencySegments,
  totalCheckIns,
  donutCenterLabel,
  chartMood,
  onSelectChartMood,
  durationBars,
  durationEmptyMessage,
  intensityBars,
  intensityEmptyMessage,
  chartGuides,
}: JournalMoodChartsSectionProps) {
  return (
    <>
      <div className="card-aurora p-6 space-y-4">
        <div className="flex items-center gap-2">
          <PieChart className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden />
          <p className="text-[10px] font-bold tracking-widest text-white uppercase">
            Mood frequency
          </p>
          <button
            type="button"
            className="ml-0.5 p-1 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
            aria-label="About mood frequency"
            onClick={chartGuides.frequency}
          >
            <HelpCircle className="w-4 h-4 text-aurora-text-muted" />
          </button>
        </div>
        <MoodFrequencyDonut
          segments={frequencySegments}
          centerValue={String(totalCheckIns)}
          centerLabel={donutCenterLabel}
          selectedMood={chartMood}
          onSelectMood={onSelectChartMood}
        />
        {chartMood ? (
          <button
            type="button"
            onClick={() => onSelectChartMood(null)}
            className="mt-2 self-start rounded-full border border-aurora-purple/45 bg-[rgba(124,58,237,0.16)] px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer hover:bg-[rgba(124,58,237,0.24)]"
          >
            Clear highlight
          </button>
        ) : null}
      </div>

      <div className="card-aurora p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden />
          <p className="text-[10px] font-bold tracking-widest text-white uppercase">
            Mood duration
          </p>
          <button
            type="button"
            className="ml-0.5 p-1 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
            aria-label="About mood duration"
            onClick={chartGuides.duration}
          >
            <HelpCircle className="w-4 h-4 text-aurora-text-muted" />
          </button>
        </div>
        <MoodDurationBars
          items={durationBars}
          emptyMessage={durationEmptyMessage}
          selectedMood={chartMood}
        />
      </div>

      <div className="card-aurora p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden />
          <p className="text-[10px] font-bold tracking-widest text-white uppercase">
            Average intensity
          </p>
          <button
            type="button"
            className="ml-0.5 p-1 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
            aria-label="About average intensity"
            onClick={chartGuides.intensity}
          >
            <HelpCircle className="w-4 h-4 text-aurora-text-muted" />
          </button>
        </div>
        <MoodIntensityBars
          items={intensityBars}
          emptyMessage={intensityEmptyMessage}
          selectedMood={chartMood}
        />
      </div>

      <p className="text-[11px] text-aurora-text-muted px-1">{ETHICS_ANALYTICS_CHARTS}</p>
    </>
  )
}