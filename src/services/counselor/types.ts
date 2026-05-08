export interface StudentInfo {
  id: string
  full_name: string
  email: string
  role: string
  /** Optional CCS program code (e.g. 'cs_dgs', 'it_st'). Set by `getStudents` / `getAccessibleStudents`. */
  program?: string
  /** Optional year level (e.g. '1st', '2nd'). Set by `getStudents` / `getAccessibleStudents`. */
  yearLevel?: string
  /** Department name when available (legacy / mixed schemas). */
  department?: string
  /** Cover photo / profile picture URL when available. */
  avatar_url?: string
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