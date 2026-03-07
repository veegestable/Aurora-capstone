export interface NotificationData {
  title: string
  message: string
  type: 'reminder' | 'alert' | 'info'
  scheduled_for: string
}

export interface NotificationResponse {
  id: string
  type: 'mood_reminder' | 'event_reminder' | 'counselor_message'
  message: string
  status: 'pending' | 'sent' | 'read'
  scheduled_for: string
  created_at: string
}
