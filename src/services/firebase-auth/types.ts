import type { CollegeCode } from '../../constants/colleges'

export interface SignUpData {
  email: string
  password: string
  fullName: string
  role: 'student' | 'counselor'
  college_code?: CollegeCode
  program?: string
}

export interface SignInData {
  email: string
  password: string
}

export type CounselorApprovalStatus = 'pending' | 'approved' | 'rejected'

/** Pending college change - admin must approve before `college_code` updates. */
export interface CollegeShiftRequest {
  requested_college_code: CollegeCode
  /** Catalog program label for the requested college (students: applied on approve). */
  requested_program: string
  reason: string
}

export interface UserProfile {
  uid: string
  email: string
  full_name: string
  role: 'student' | 'counselor' | 'admin'
  email_verified?: boolean
  approval_status?: CounselorApprovalStatus
  preferred_name?: string
  /**
   * Canonical college code. Preferred over `department`.
   */
  college_code?: CollegeCode | string
  /**
   * @deprecated Legacy field, use `college_code` instead.
   * Kept for older Firestore documents.
   */
  department?: string
  college_shift_pending?: boolean
  college_shift_request?: CollegeShiftRequest
  program?: string
  year_level?: string
  student_number?: string
  contact_number?: string
  sex?: 'male' | 'female'
  bio?: string
  avatar_url?: string | null
  created_at: Date
  updated_at?: Date
}

export interface UpdateProfileData {
  full_name?: string
  preferred_name?: string
  college_code?: string
  department?: string
  program?: string
  year_level?: string
  student_number?: string
  contact_number?: string
  sex?: 'male' | 'female'
  bio?: string
  avatar_url?: string | null
}