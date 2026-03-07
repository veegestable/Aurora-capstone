export interface MoodData {
  user_id: string
  emotions: Array<{
    emotion: string
    confidence: number
    color: string
  }>
  notes: string
  log_date: Date
  energy_level: number
  stress_level: number
  detection_method: 'manual' | 'ai'
}

export interface ScheduleData {
  user_id: string
  title: string
  description?: string
  event_date: Date
  event_type: 'exam' | 'deadline' | 'meeting' | 'other'
}

export interface NotificationData {
  user_id: string
  type: 'mood_reminder' | 'event_reminder' | 'counselor_message'
  message: string
  status: 'pending' | 'sent' | 'read'
  scheduled_for: Date
}