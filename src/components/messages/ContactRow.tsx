import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
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
  /** Counselor inbox: hover ⋮ → Archive / Cancel */
  onArchiveRequest?: () => void
}

export function ContactRow({ contact, onSelect, onArchiveRequest }: ContactRowProps) {
  const peerOnline = usePeerPresence(contact.id)
  const isOnline = peerOnline || contact.isOnline
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [menuOpen])

  const showMenu = !!onArchiveRequest
  const menuVisible = menuOpen
    ? 'opacity-100 pointer-events-auto'
    : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto max-md:opacity-100 max-md:pointer-events-auto'

  return (
    <div
      className={`group relative w-full flex items-stretch border-b border-white/8 hover:bg-white/5 transition-colors ${
        menuOpen ? 'bg-white/5' : ''
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 min-w-0 items-center py-3.5 pl-0 pr-2 text-left cursor-pointer"
        aria-label={`Chat with ${contact.name}`}
      >
        <div className="relative mr-3 shrink-0">
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
          <div className="flex items-center justify-between gap-2 mb-1 pr-2">
            <span className="font-bold text-white text-sm truncate">{contact.name}</span>
            {!showMenu && (
              <span
                className={`text-xs shrink-0 tabular-nums ${
                  contact.isUnread ? 'font-bold text-aurora-blue' : 'text-[#7B8EC8]'
                }`}
              >
                {contact.time}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 min-w-0 pr-2">
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

      {showMenu && (
        <div
          className="flex items-center gap-1 shrink-0 py-3.5 pr-3 self-start"
          ref={menuRef}
        >
          <span
            className={`text-xs tabular-nums shrink-0 ${
              contact.isUnread ? 'font-bold text-aurora-blue' : 'text-[#7B8EC8]'
            }`}
          >
            {contact.time}
          </span>
          <div className={`relative transition-opacity ${menuVisible}`}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7B8EC8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label={`Options for ${contact.name}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 z-30 min-w-[140px] py-1 rounded-xl border border-aurora-border bg-[#0f1538] shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onArchiveRequest?.()
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-sm font-semibold text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                >
                  Archive
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="w-full px-3.5 py-2.5 text-left text-sm font-medium text-[#7B8EC8] hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


