export type UserRole = 'admin' | 'counselor' | 'student'

export type CounselorApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  approval_status?: CounselorApprovalStatus
  preferred_name?: string
  department?: string
  /** Degree program (e.g. "BS CS (Computer Science)"). Distinct from `department`. */
  program?: string
  year_level?: string
  student_number?: string
  /** Contact number for scheduling and urgent reach-out only. */
  contact_number?: string
  sex?: 'male' | 'female'
  bio?: string
  avatar_url?: string | null
}