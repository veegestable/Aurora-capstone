export interface EmotionData {
  emotion: string
  confidence: number
  color: string
}

export interface MoodDataInput {
  emotions: EmotionData[]
  notes?: string
  log_date: string | Date
  energy_level?: number
  stress_level?: number
  detection_method?: 'manual' | 'ai'
}