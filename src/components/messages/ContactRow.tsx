import { LetterAvatar } from '../LetterAvatar'
import { usePeerPresence } from '../../hooks/usePeerPresence'
import type { CounselorContact } from '../../types/message.types'

interface ContactRowProps {
  contact: CounselorContact
  onSelect: () => void
}

export function ContactRow({ contact, onSelect }: ContactRowProps) {
  const peerOnline = usePeerPresence(contact.id)
  const isOnline = peerOnline || contact.isOnline

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center py-3.5 border-b border-aurora-gray-200 hover:bg-aurora-gray-50 transition-colors cursor-pointer text-left"
      aria-label={`Chat with ${contact.name}`}
    >
      <div className="relative mr-3">
        <LetterAvatar name={contact.name} size={48} />
        {isOnline && (
          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-aurora-accent-green border-2 border-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-aurora-primary-dark text-sm truncate">
            {contact.name}
          </span>
          <span
            className={`text-xs shrink-0 ml-2 ${
              contact.isUnread
                ? 'font-bold text-aurora-secondary-blue'
                : 'text-aurora-gray-400'
            }`}
          >
            {contact.time}
          </span>
        </div>
        <p className="text-sm text-aurora-gray-500 truncate">{contact.preview}</p>
      </div>
    </button>
  )
}
