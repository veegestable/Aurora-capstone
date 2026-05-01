import { LetterAvatar } from '../LetterAvatar'
import { usePeerPresence } from '../../hooks/usePeerPresence'
import type { CounselorContact, StudentContact } from '../../types/message.types'

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
        <p className="text-sm text-[#7B8EC8] truncate">{contact.preview}</p>
      </div>
    </button>
  )
}