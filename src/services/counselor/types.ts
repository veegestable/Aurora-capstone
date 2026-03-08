export interface StudentInfo {
  id: string
  full_name: string
  email: string
  role: string
}

export interface MoodLogResponse {
  id: string
  user_id: string
  emotions: string[]
  colors: string[]
  confidence: number[]
  note?: string
  log_date: string
}

export interface ScheduleResponse {
  id: string
  user_id: string
  event_type: string
  event_date: string
  description?: string
}