import type { Timestamp } from 'firebase/firestore'

export interface CounselorNoteDoc {
  counselorId: string
  studentId: string
  note: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CounselorNote {
  id: string
  counselorId: string
  studentId: string
  note: string
  createdAt: Date
  updatedAt: Date
}