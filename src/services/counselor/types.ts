export interface StudentInfo {
  id: string
  full_name: string
  email: string
  role: string
  college_code?: string
  /** Optional CCS program code (e.g. 'cs_dgs', 'it_st'). */
  program?: string
  /** Optional year level (e.g. '1st', '2nd'). */
  yearLevel?: string
  year_level?: string
  /** Department name when available (legacy / mixed schemas). */
  department?: string
  /** Cover photo / profile picture URL when available. */
  avatar_url?: string
}