import { useState } from 'react'
import { LetterAvatar } from '../LetterAvatar'
import { Calendar, Check } from 'lucide-react'
import type { ChatMessage, SessionMessage } from '../../types/message.types'

interface ChatBubbleProps {
  message: ChatMessage
  contactName: string
  userName: string
  contactAvatarUrl?: string
  userAvatarUrl?: string
  /** When 'counselor', session messages render the counselor card (View Details / Reschedule). */
  viewerRole?: 'counselor' | 'student'
  onConfirmSession?: (sessionId: string, slot: { date: string; time: string }) => void
  isConfirming?: boolean
  onViewDetails?: (msg: SessionMessage) => void
  onReschedule?: (msg: SessionMessage) => void
}

const SETTLED_STATUSES = ['confirmed', 'completed', 'missed', 'cancelled', 'rescheduled']

function CounselorSessionCard({
  msg,
  onViewDetails,
  onReschedule,
}: {
  msg: SessionMessage
  onViewDetails?: (msg: SessionMessage) => void
  onReschedule?: (msg: SessionMessage) => void
}) {
  const session = msg.session
  const st = session.sessionStatus ?? 'pending'
  const hasAgreedTime = !!(session.agreedSlot?.date && session.agreedSlot?.time)

  const statusLabel = (() => {
    if (st === 'confirmed' || hasAgreedTime) return 'ACCEPTED'
    if (st === 'completed') return 'COMPLETED'
    if (st === 'missed') return 'MISSED'
    if (st === 'cancelled') return 'CANCELLED'
    if (st === 'rescheduled') return 'RESCHEDULED'
    if (st === 'expired') return 'EXPIRED'
    return 'SESSION INVITE'
  })()

  const statusStyle: Record<string, { bg: string; text: string }> = {
    'ACCEPTED':       { bg: 'bg-aurora-green/15', text: 'text-aurora-green' },
    'COMPLETED':      { bg: 'bg-aurora-blue/20',  text: 'text-aurora-blue' },
    'MISSED':         { bg: 'bg-orange-500/20',   text: 'text-orange-300' },
    'CANCELLED':      { bg: 'bg-aurora-red/15',   text: 'text-aurora-red' },
    'RESCHEDULED':    { bg: 'bg-aurora-purple/20', text: 'text-aurora-purple' },
    'EXPIRED':        { bg: 'bg-white/8',         text: 'text-aurora-text-muted' },
    'SESSION INVITE': { bg: 'bg-aurora-amber/20', text: 'text-aurora-amber' },
  }
  const style = statusStyle[statusLabel] ?? statusStyle['SESSION INVITE']

  const displaySlot = session.agreedSlot ?? session.timeSlots?.[0]
  const settled = SETTLED_STATUSES.includes(st)
  const showReschedule = !settled || st === 'confirmed'

  const statusHint = (() => {
    if (statusLabel === 'ACCEPTED')       return 'Student confirmed this session time'
    if (statusLabel === 'SESSION INVITE') return 'Awaiting student confirmation'
    if (statusLabel === 'COMPLETED')      return 'Session completed'
    if (statusLabel === 'MISSED')         return 'Student did not show up'
    if (statusLabel === 'CANCELLED')      return 'Session cancelled'
    if (statusLabel === 'RESCHEDULED')    return 'A new invite was sent'
    if (statusLabel === 'EXPIRED')        return 'This invite expired'
    return null
  })()

  return (
    <div className="max-w-[78%] rounded-2xl overflow-hidden border border-white/15 bg-linear-to-br from-aurora-blue to-aurora-purple p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-md ${style.bg} ${style.text}`}>
          {statusLabel}
        </span>
        <Calendar className="w-3.5 h-3.5 text-white/85" />
      </div>

      <p className="text-base font-bold text-white leading-tight">
        {session.title ?? 'Counseling Session'}
      </p>

      {displaySlot && (
        <div className="flex items-center gap-2 mt-2">
          <Calendar className="w-3.5 h-3.5 text-white/85" />
          <p className="text-[13px] text-white/90">
            {displaySlot.date} • {displaySlot.time}
          </p>
        </div>
      )}

      {session.note && (
        <p className="text-[12px] italic text-white/85 mt-2 line-clamp-2">"{session.note}"</p>
      )}

      {statusHint && (
        <p className="text-[11px] text-white/80 mt-2">{statusHint}</p>
      )}

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => onViewDetails?.(msg)}
          className="flex-1 rounded-[10px] py-2 text-[13px] font-bold bg-white/95 text-aurora-blue hover:bg-white transition-colors cursor-pointer"
        >
          View Details
        </button>
        {showReschedule && (
          <button
            type="button"
            onClick={() => onReschedule?.(msg)}
            disabled={!onReschedule}
            className="flex-1 rounded-[10px] py-2 text-[13px] font-semibold bg-transparent text-white border-2 border-white/90 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Reschedule
          </button>
        )}
      </div>

      <p className="text-[11px] text-white/70 mt-2 text-right">{msg.time}</p>
    </div>
  )
}

export function ChatBubble({
  message,
  contactName,
  userName,
  contactAvatarUrl,
  userAvatarUrl,
  viewerRole,
  onConfirmSession,
  isConfirming,
  onViewDetails,
  onReschedule,
}: ChatBubbleProps) {
  const isMe = message.senderId === 'me'
  const senderLabel = isMe ? 'You' : contactName

  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0)

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
                  message.sessionRequest.status === 'pending' || message.sessionRequest.status === 'requested'
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
        ) : viewerRole === 'counselor' ? (
          /* Counselor sees View Details / Reschedule on session invites in chat. */
          <CounselorSessionCard
            msg={message}
            onViewDetails={onViewDetails}
            onReschedule={onReschedule}
          />
        ) : (
          /* Student-facing session invite (existing behavior). */
          <div className="max-w-[78%] card-aurora border border-white/8 bg-[#0B0D30]">
            <p className="text-[11px] text-aurora-gray-400 mb-2">
              Aurora Academic Support
            </p>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-aurora-secondary-blue/20 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-aurora-secondary-blue" />
              </div>
              <p className="text-base font-bold text-white leading-tight">
                {message.session.title ?? 'Schedule Next Session'}
              </p>
            </div>

            {message.session.note && (
              <p className="text-sm text-aurora-gray-400 italic mb-3.5 leading-relaxed">
                "{message.session.note}"
              </p>
            )}

            {message.session.sessionStatus && SETTLED_STATUSES.includes(message.session.sessionStatus) ? (
              <div className={`rounded-xl px-3 py-2.5 mb-2 border ${
                message.session.sessionStatus === 'confirmed'
                  ? 'bg-green-500/15 border-green-500/30'
                  : 'bg-slate-400/10 border-slate-400/25'
              }`}>
                <p className={`text-[13px] font-semibold leading-relaxed ${
                  message.session.sessionStatus === 'confirmed' ? 'text-green-400' : 'text-aurora-gray-400'
                }`}>
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
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selectedSlotIndex === i ? 'border-aurora-secondary-blue' : 'border-aurora-gray-400 group-hover:border-blue-400'
                        }`}>
                          {selectedSlotIndex === i && <div className="w-2 h-2 rounded-full bg-aurora-secondary-blue" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {message.session.timeSlots && message.session.timeSlots.length > 0 && onConfirmSession && (
                  <button
                    disabled={isConfirming || isMe}
                    onClick={() => {
                      if (message.session.timeSlots && message.session.id) {
                        onConfirmSession(message.session.id, message.session.timeSlots[selectedSlotIndex])
                      }
                    }}
                    className={`w-full mt-1.5 rounded-xl flex items-center justify-center gap-2 py-2.5 transition-all
                      ${isConfirming || isMe
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

            <p className="text-[11px] text-aurora-gray-400 mt-2 text-right">
              {message.time}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}