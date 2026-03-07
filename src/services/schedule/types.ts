export interface ScheduleData {
  title?: string
  event_type: 'exam' | 'deadline' | 'meeting' | 'other'
  event_date: string
  description?: string
}

export interface ScheduleResponse {
  id: string
  title: string
  description: string
  event_date: string
  event_type: 'exam' | 'deadline' | 'meeting' | 'other'
}
