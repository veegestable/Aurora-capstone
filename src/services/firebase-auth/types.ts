export interface SignUpData {
  email: string
  password: string
  fullName: string
  role: 'student' | 'counselor'
}

export interface SignInData {
  email: string
  password: string
}

export type CounselorApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface UserProfile {
  uid: string
  email: string
  full_name: string
  role: 'student' | 'counselor' | 'admin'
  approval_status?: CounselorApprovalStatus
  preferred_name?: string
  department?: string
  year_level?: string
  student_number?: string
  sex?: 'male' | 'female'
  bio?: string
  avatar_url?: string | null
  created_at: Date
  updated_at?: Date
}

export interface UpdateProfileData {
  full_name?: string
  preferred_name?: string
  department?: string
  year_level?: string
  student_number?: string
  sex?: 'male' | 'female'
  bio?: string
  avatar_url?: string | null
}