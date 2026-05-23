import {
  isCollegeCode,
  resolveCollegeCodeFromUserData,
} from '../constants/colleges'

export function conversationCollegeTagFromData(
  data: Record<string, unknown> | null | undefined,
): string {
  const raw = data?.college_code
  return typeof raw === 'string' ? raw.trim() : ''
}

export function conversationInboxClassifyFromData(
  data: Record<string, unknown>,
  viewerCollege: string,
  collegeByUserId: Record<string, string>,
): ConversationInboxClassifyInput {
  const counselorId = String(data.counselorId ?? '')
  const studentId = String(data.studentId ?? '')
  return {
    conversationCollegeCode: conversationCollegeTagFromData(data),
    viewerCollegeCode: viewerCollege,
    counselorCollegeCode: collegeByUserId[counselorId] ?? '',
    studentCollegeCode: collegeByUserId[studentId] ?? '',
  }
}

export type ConversationInboxClassifyInput = {
  conversationCollegeCode: string
  viewerCollegeCode: string
  counselorCollegeCode: string
  studentCollegeCode: string
}

export function isActiveCollegeInboxThread(
  input: ConversationInboxClassifyInput,
): boolean {
  const viewer = input.viewerCollegeCode.trim()
  if (!viewer || !isCollegeCode(viewer)) {
    return !isPastCollegeThread(input)
  }

  const tag = input.conversationCollegeCode.trim()
  const counselor = input.counselorCollegeCode.trim()
  const student = input.studentCollegeCode.trim()

  if (tag && tag !== viewer) return false
  if (!counselor || !isCollegeCode(counselor) || counselor !== viewer) {
    return false
  }
  if (!student || !isCollegeCode(student) || student !== viewer) {
    return false
  }

  return true
}

export function isPastCollegeThread(
  input: ConversationInboxClassifyInput,
): boolean {
  const viewer = input.viewerCollegeCode.trim()
  if (!viewer || !isCollegeCode(viewer)) {
    return false
  }
  return !isActiveCollegeInboxThread(input)
}

export function getPastCollegeThreadBannerText(role: 'counselor' | 'student'): string {
  if (role === 'counselor') {
    return 'This student has moved to another college, or this chat is from a previous college assignment. Messaging is closed. You can read history here only.'
  }
  return 'This conversation is from a previous college or your counselor is in another college. Messaging is closed. You can read history here only.'
}

export const MESSAGING_CLOSED_ERROR =
  'Messaging is closed for this conversation.'

export function resolveCollegeFromUserRecord(
  data: Record<string, unknown> | null | undefined,
): string {
  return resolveCollegeCodeFromUserData(data) || ''
}
