import type { ConversationPreviewKind } from '../../../types/message.types'

/**
 * Classify using the raw conversations.lastMessage string (before UI sanitizers).
 * Keep in sync with places that write lastMessage (sessions + messages services).
 */
export function inferConversationPreviewKind(rawLastMessage: unknown): ConversationPreviewKind {
  const s = String(rawLastMessage ?? '').trim()
  if (s === '') return 'plain'
  if (s === 'Conversation started') return 'conversation_started'

  const lower = s.toLowerCase()
  if (
    lower === 'session invite' ||
    lower.startsWith('session invite ')
  ) {
    return 'session_invite'
  }

  if (
    lower === 'session request' ||
    lower.startsWith('session request ') ||
    lower.startsWith('session request:')
  ) {
    return 'session_request'
  }

  if (/^session:\s*\S/i.test(s)) {
    return 'session_topic'
  }

  return 'plain'
}