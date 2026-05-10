export type ConversationPreviewKind =
  | 'plain'
  | 'session_request'
  | 'session_invite'
  | 'session_topic'
  | 'conversation_started'

export interface CounselorContact {
  id: string
  conversationId: string
  name: string
  preview: string
  previewKind?: ConversationPreviewKind
  time: string
  avatar: string
  isOnline: boolean
  isUnread: boolean
}

export interface StudentContact {
  id: string
  conversationId: string
  name: string
  preview: string
  previewKind?: ConversationPreviewKind
  time: string
  avatar: string
  isOnline: boolean
  isUnread: boolean
  isAlerted: boolean
  borderColor?: string
  program?: string
  studentId: string
}

export interface TextMessage {
  id: string
  senderId: 'me' | 'them'
  type: 'text'
  text: string
  time: string
}

export interface SessionMessage {
  id: string
  senderId: 'me' | 'them'
  type: 'session'
  session: {
    id: string
    title?: string
    timeSlots?: Array<{ 
      date: string 
      time: string
    }>
    note?: string
    sessionStatus?: string
    agreedSlot?: { date: string; time: string }
  }
  time: string
}

export interface SessionRequestMessage {
  id: string
  senderId: 'me' | 'them'
  type: 'session_request'
  sessionRequest: {
    id: string
    sessionId: string | null
    preferredTime: string
    note: string
    status: string
  }
  time: string
}

export type ChatMessage = TextMessage | SessionMessage | SessionRequestMessage