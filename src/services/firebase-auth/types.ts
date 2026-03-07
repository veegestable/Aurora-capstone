export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role: 'student' | 'counselor';
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  full_name: string;
  role: 'student' | 'counselor';
  avatar_url?: string;
  created_at: Date;
  updated_at?: Date;
}
