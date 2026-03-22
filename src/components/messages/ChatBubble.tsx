import { LetterAvatar } from '../LetterAvatar'
import type { ChatMessage } from '../../types/message.types'

interface ChatBubbleProps {
  message: ChatMessage
  contactName: string
  userName: string
}

export function ChatBubble({ message, contactName, userName }: ChatBubbleProps) {
  const isMe = message.senderId === 'me'
  const senderLabel = isMe ? 'You' : contactName

  return (
    <div className="mb-4">
      {/* Sender label */}
      <p
        className={`text-xs text-aurora-gray-400 mb-1 mx-1 ${
          isMe ? 'text-right' : 'text-left'
        }`}
      >
        {senderLabel}
      </p>

      {/* Bubble row */}
      <div
        className={`flex items-end gap-2 ${
          isMe ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        <LetterAvatar
          name={isMe ? userName : contactName}
          size={32}
        />

        {message.type === 'text' ? (
          <div
            className={`max-w-[78%] px-4 py-3 ${
              isMe
                ? 'bg-aurora-secondary-blue rounded-2xl rounded-br-sm'
                : 'bg-aurora-gray-100 rounded-2xl rounded-bl-sm'
            }`}
          >
            <p className={`text-sm leading-relaxed ${isMe ? 'text-white' : 'text-aurora-primary-dark'}`}>
              {message.text}
            </p>
            <p className={`text-[11px] mt-1 text-right ${isMe ? 'text-white/60' : 'text-aurora-gray-400'}`}>
              {message.time}
            </p>
          </div>
        ) : message.type === 'session_request' ? (
          <div className="max-w-[78%] card-aurora border border-aurora-accent-purple/30">
            <p className="text-xs font-bold text-aurora-accent-purple uppercase tracking-wider mb-1">
              Session Request
            </p>
            <p className="text-sm text-aurora-primary-dark font-semibold">
              {message.sessionRequest.preferredTime || 'No preferred time'}
            </p>
            {message.sessionRequest.note && (
              <p className="text-xs text-aurora-gray-500 mt-1">
                {message.sessionRequest.note}
              </p>
            )}
            <div className="mt-2 flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  message.sessionRequest.status === 'pending'
                    ? 'bg-aurora-accent-orange'
                    : message.sessionRequest.status === 'confirmed'
                      ? 'bg-aurora-accent-green'
                      : 'bg-aurora-gray-400'
                }`}
              />
              <span className="text-xs text-aurora-gray-500 capitalize">
                {message.sessionRequest.status}
              </span>
            </div>
            <p className="text-[11px] text-aurora-gray-400 mt-2 text-right">
              {message.time}
            </p>
          </div>
        ) : (
          /* session invite — minimal card for now */
          <div className="max-w-[78%] card-aurora border border-aurora-secondary-blue/30">
            <p className="text-xs font-bold text-aurora-secondary-blue uppercase tracking-wider mb-1">
              Session Invite
            </p>
            <p className="text-sm text-aurora-primary-dark">
              {message.session.title ?? 'Counseling Session'}
            </p>
            <p className="text-[11px] text-aurora-gray-400 mt-2 text-right">
              {message.time}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
