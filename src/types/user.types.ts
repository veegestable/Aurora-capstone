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
  year_level?: string
  student_number?: string
  sex?: 'male' | 'female'
  bio?: string
  avatar_url?: string | null
}