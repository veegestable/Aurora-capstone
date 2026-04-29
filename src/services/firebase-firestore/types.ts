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