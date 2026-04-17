export type SessionStatus = 
  | 'requested'
  | 'pending'
  | 'confirmed'
  | 'needs_rescheduling'
  | 'expired'
  | 'completed'
  | 'missed'
  | 'rescheduled'
  | 'cancelled'

export interface TimeSlot {
  date: string
  time: string
}

export interface Session {
  id: string
  counselorId: string
  studentId: string
  riskFlagId: string | null
  initiatedBy: 'student' | 'counselor'
  studentRequestNote: string
  preferredTimeFromStudent?: string 
  proposedSlots: TimeSlot[]
  confirmedSlot: TimeSlot | null
  finalSlot: TimeSlot | null
  status: SessionStatus
  attendanceNote: string | null
  cancelReason: string | null
  reminderSent: boolean
  sessionHistoryBadge: string
  createdAt: Date
  updatedAt: Date
}