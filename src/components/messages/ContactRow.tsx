import { LetterAvatar } from '../LetterAvatar'
import { usePeerPresence } from '../../hooks/usePeerPresence'
import type { CounselorContact, StudentContact } from '../../types/message.types'
import type { ConversationPreviewKind } from '../../types/message.types'

const PREVIEW_BADGE_LABEL: Partial<Record<ConversationPreviewKind, string>> = {
  session_request: 'Session request',
  session_invite: 'Invite',
  session_topic: 'Session',
  conversation_started: 'Started',
}

const PREVIEW_BADGE_CLASS: Partial<Record<ConversationPreviewKind, string>> = {
  session_request: 'bg-[rgba(124,58,237,0.2)] border-[rgba(124,58,237,0.35)] text-aurora-purple',
  session_invite: 'bg-[rgba(45,107,255,0.18)] border-[rgba(45,107,255,0.38)] text-aurora-blue',
  session_topic:
    'bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.35)] text-amber-300',
  conversation_started: 'bg-white/10 border-white/14 text-[#7B8EC8]',
}

function truncatePreviewSubtitle(previewKind: ConversationPreviewKind | undefined, preview: string) {
  if (!previewKind || previewKind === 'plain') return preview
  let t = preview

  const strip = [
    /^Session request\s*:?\s*/i,
    /^Session Invite\s*:?\s*/i,
    /^Conversation started\s*:?\s*/i,
    /^Session:\s*/i,
  ]
  for (const re of strip) t = t.replace(re, '').trim()

  return t || preview
}

interface ContactRowProps {
  contact: CounselorContact | StudentContact
  onSelect: () => void
}

export function ContactRow({ contact, onSelect }: ContactRowProps) {
  const peerOnline = usePeerPresence(contact.id)
  const isOnline = peerOnline || contact.isOnline

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center py-3.5 border-b border-white/8 hover:bg-white/5 transition-colors cursor-pointer text-left"
      aria-label={`Chat with ${contact.name}`}
    >
      <div className="relative mr-3">
        <LetterAvatar
          name={contact.name}
          size={48}
          avatarUrl={contact.avatar}
          className="border-2 border-[#7B8EC8]/30"
        />
        {isOnline && (
          <div className="absolute bottom-0.5 left-0.5 w-3 h-3 rounded-full bg-aurora-blue border-2 border-aurora-bg-messages" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-white text-sm truncate">
            {contact.name}
          </span>
          <span
            className={`text-xs shrink-0 ml-2 ${
              contact.isUnread
                ? 'font-bold text-aurora-blue'
                : 'text-[#7B8EC8]'
            }`}
          >
            {contact.time}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          {contact.previewKind && contact.previewKind !== 'plain' && (
            <span
              className={`shrink-0 px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wide ${PREVIEW_BADGE_CLASS[contact.previewKind] ?? ''}`}
              aria-hidden
            >
              {PREVIEW_BADGE_LABEL[contact.previewKind] ?? 'Update'}
            </span>
          )}
          <p
            className="text-sm text-[#7B8EC8] truncate min-w-0"
            title={contact.preview}
          >
            {truncatePreviewSubtitle(contact.previewKind, contact.preview)}
          </p>
        </div>
      </div>
    </button>
  )
}