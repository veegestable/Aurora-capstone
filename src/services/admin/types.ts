import type { CounselorApprovalStatus } from '../../types/user.types'

export interface AdminCounselorUser {
  id: string
  full_name: string
  email: string
  approval_status?: CounselorApprovalStatus
  department?: string
  bio?: string
  avatar_url?: string | null
}

export interface AdminStudentUser {
  id: string
  full_name: string
  email: string
  department?: string
  year_level?: string
  student_number?: string
  avatar_url?: string | null
}