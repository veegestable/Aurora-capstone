import { useState } from 'react'
import { LetterAvatar } from '../LetterAvatar'
import { Calendar, Check } from 'lucide-react'
import { CounselorSessionChatCard } from '../counselor/CounselorSessionChatCard'
import { SessionRequestReceivedCard } from '../counselor/SessionRequestReceivedCard'
import { isOpenSessionRequestExpired } from '../../utils/dateHelpers'
import type { ChatMessage, SessionMessage, SessionRequestMessage } from '../../types/message.types'

interface ChatBubbleProps {
  message: ChatMessage
  contactName: string
  userName: string
  contactAvatarUrl?: string
  userAvatarUrl?: string
  viewerRole?: 'counselor' | 'student'
  messagingClosed?: boolean
  onConfirmSession?: (sessionId: string, slot: { date: string; time: string }) => void
  isConfirming?: boolean
  onViewDetails?: (msg: SessionMessage) => void
  onReschedule?: (msg: SessionMessage) => void
  onAcceptSessionRequest?: (msg: SessionRequestMessage) => void
  onProposeSessionRequest?: (msg: SessionRequestMessage) => void
  onMarkAttendance?: (msg: SessionMessage) => void
}

const SETTLED_STATUSES = ['confirmed', 'completed', 'missed', 'cancelled', 'rescheduled']

export function ChatBubble({
  message,
  contactName,
  userName,
  contactAvatarUrl,
  userAvatarUrl,
  viewerRole,
  messagingClosed = false,
  onConfirmSession,
  isConfirming,
  onViewDetails,
  onReschedule,
  onAcceptSessionRequest,
  onProposeSessionRequest,
  onMarkAttendance,
}: ChatBubbleProps) {
  const isMe = message.senderId === 'me'
  const senderLabel = isMe ? 'You' : contactName
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0)

  const sessionRequestExpired =
    message.type === 'session_request'
      ? isOpenSessionRequestExpired({
          status: message.sessionRequest.status,
          preferredTime: message.sessionRequest.preferredTime,
          requestedAtMs: message.sessionRequest.requestedAtMs,
        })
      : false

  return (
    <div className="mb-4">
      <p className={`text-xs text-aurora-gray-400 mb-1 mx-1 ${isMe ? 'text-right' : 'text-left'}`}>
        {senderLabel}
      </p>

      <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        <LetterAvatar
          name={isMe ? userName : contactName}
          size={32}
          avatarUrl={isMe ? userAvatarUrl : contactAvatarUrl}
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
        ) : message.type === 'session_request' && viewerRole === 'counselor' ? (
          <div className="max-w-[85%]">
            <SessionRequestReceivedCard
              isFromMe={isMe}
              data={{
                sessionId: message.sessionRequest.sessionId ?? '',
                title: 'Session Request',
                preferredTime: message.sessionRequest.preferredTime || undefined,
                note: message.sessionRequest.note,
                status: message.sessionRequest.status,
                isExpired: sessionRequestExpired,
              }}
              onAccept={
                !messagingClosed &&
                message.sessionRequest.sessionId &&
                message.sessionRequest.preferredTime &&
                !sessionRequestExpired
                  ? () => onAcceptSessionRequest?.(message)
                  : undefined
              }
              onProposeNewTime={
                !messagingClosed && message.sessionRequest.sessionId && !sessionRequestExpired
                  ? () => onProposeSessionRequest?.(message)
                  : undefined
              }
            />
            <p className="text-[11px] text-aurora-gray-400 mt-1">{message.time}</p>
          </div>
        ) : message.type === 'session_request' ? (
          <div className="max-w-[78%] card-aurora border border-aurora-accent-purple/30 p-4">
            <p className="text-xs font-bold text-aurora-accent-purple uppercase tracking-wider mb-1">
              Session Request
            </p>
            <p className="text-sm text-aurora-primary-dark font-semibold">
              {message.sessionRequest.preferredTime || 'No preferred time'}
            </p>
            {message.sessionRequest.note ? (
              <p className="text-xs text-aurora-gray-500 mt-1">{message.sessionRequest.note}</p>
            ) : null}
            <p className="text-[11px] text-aurora-gray-400 mt-2 text-right">{message.time}</p>
          </div>
        ) : viewerRole === 'counselor' ? (
          <CounselorSessionChatCard
            message={message}
            onViewDetails={onViewDetails}
            onReschedule={messagingClosed ? undefined : onReschedule}
            onMarkAttendance={messagingClosed ? undefined : onMarkAttendance}
          />
        ) : (
          <div className="max-w-[78%] card-aurora border border-white/8 bg-[#0B0D30] p-4">
            <p className="text-[11px] text-aurora-gray-400 mb-2">Aurora Academic Support</p>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-aurora-secondary-blue/20 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-aurora-secondary-blue" />
              </div>
              <p className="text-base font-bold text-white leading-tight">
                {message.session.title ?? 'Schedule Next Session'}
              </p>
            </div>

            {message.session.note ? (
              <p className="text-sm text-aurora-gray-400 italic mb-3.5 leading-relaxed">
                &ldquo;{message.session.note}&rdquo;
              </p>
            ) : null}

            {message.session.sessionStatus && SETTLED_STATUSES.includes(message.session.sessionStatus) ? (
              <div
                className={`rounded-xl px-3 py-2.5 mb-2 border ${
                  message.session.sessionStatus === 'confirmed'
                    ? 'bg-green-500/15 border-green-500/30'
                    : 'bg-slate-400/10 border-slate-400/25'
                }`}
              >
                <p
                  className={`text-[13px] font-semibold leading-relaxed ${
                    message.session.sessionStatus === 'confirmed' ? 'text-green-400' : 'text-aurora-gray-400'
                  }`}
                >
                  {message.session.sessionStatus === 'confirmed'
                    ? message.session.agreedSlot
                      ? `Accepted — ${message.session.agreedSlot.date}, ${message.session.agreedSlot.time}`
                      : 'Accepted — saved to your schedule.'
                    : message.session.sessionStatus === 'completed'
                      ? 'This session was completed.'
                      : message.session.sessionStatus === 'missed'
                        ? 'This session was marked as missed.'
                        : message.session.sessionStatus === 'rescheduled'
                          ? 'This session was rescheduled — see the newer invite below.'
                          : 'This session was cancelled.'}
                </p>
              </div>
            ) : (
              <>
                {message.session.timeSlots && message.session.timeSlots.length > 0 && (
                  <div className="flex flex-col gap-2 mb-3.5">
                    {message.session.timeSlots.map((slot, i) => (
                      <div
                        key={i}
                        className="flex items-center cursor-pointer group"
                        onClick={() => setSelectedSlotIndex(i)}
                      >
                        <Calendar className="w-3.5 h-3.5 text-aurora-gray-400 mr-2 shrink-0 group-hover:text-aurora-secondary-blue transition-colors" />
                        <p className="flex-1 text-sm text-white group-hover:text-blue-100 transition-colors">
                          {slot.date}, {slot.time}
                        </p>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selectedSlotIndex === i
                              ? 'border-aurora-secondary-blue'
                              : 'border-aurora-gray-400 group-hover:border-blue-400'
                          }`}
                        >
                          {selectedSlotIndex === i && (
                            <div className="w-2 h-2 rounded-full bg-aurora-secondary-blue" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {message.session.timeSlots &&
                  message.session.timeSlots.length > 0 &&
                  onConfirmSession && (
                    <button
                      disabled={isConfirming || isMe}
                      onClick={() => {
                        if (message.session.timeSlots && message.session.id) {
                          onConfirmSession(
                            message.session.id,
                            message.session.timeSlots[selectedSlotIndex],
                          )
                        }
                      }}
                      className={`w-full mt-1.5 rounded-xl flex items-center justify-center gap-2 py-2.5 transition-all ${
                        isConfirming || isMe
                          ? 'bg-aurora-secondary-blue/15 border border-aurora-secondary-blue/40 opacity-60 cursor-not-allowed'
                          : 'bg-aurora-secondary-blue/20 border border-aurora-secondary-blue cursor-pointer hover:bg-aurora-secondary-blue/30 active:scale-[0.98]'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-aurora-secondary-blue/20 flex items-center justify-center shrink-0">
                        <Check className="w-[18px] h-[18px] text-[#32CD32]" strokeWidth={2.75} />
                      </div>
                      <span className="text-sm font-bold tracking-wide text-[#CFE0FF]">
                        {isConfirming ? 'Confirming...' : 'Confirm slot'}
                      </span>
                    </button>
                  )}
              </>
            )}

            <p className="text-[11px] text-aurora-gray-400 mt-2 text-right">{message.time}</p>
          </div>
        )}
      </div>
    </div>
  )
}
