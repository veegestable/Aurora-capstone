import type { CounselorApprovalStatus } from '../../types/user.types'

export interface AdminCounselorUser {
  id: string
  full_name: string
  email: string
  approval_status?: CounselorApprovalStatus
  department?: string
  bio?: string
  avatar_url?: string | null
  contact_number?: string
}

export interface AdminStudentUser {
  id: string
  full_name: string
  email: string
  department?: string
  college_code?: string
  program?: string
  year_level?: string
  student_number?: string
  contact_number?: string
  preferred_name?: string
  avatar_url?: string | null
}