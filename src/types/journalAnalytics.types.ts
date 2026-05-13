export interface DayBar {
  dayLabel: string
  avg: number
  color: string
  hasData: boolean
}

export interface WeekSummary {
  stress: string
  energy: string
  sleep: string
  stabilityPct: number
  stabilityLabel: string
  pattern: string
  topStressors: {
    tag: string
    count: number
  }[]
}