import type { JournalAnalyticsModel } from '../../../hooks/useJournalAnalytics'
import type { JournalChartGuides } from '../JournalMoodChartsSection'

export type JournalAnalyticsSceneProps = {
  a: JournalAnalyticsModel
  chartMood: string | null
  onSelectChartMood: (mood: string | null) => void
  donutCenterLabel: string
  chartGuides: JournalChartGuides
}