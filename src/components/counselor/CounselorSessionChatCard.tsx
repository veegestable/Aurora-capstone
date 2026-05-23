import { Calendar } from 'lucide-react'
import { isSessionScheduledTimeReached } from '../../utils/dateHelpers'
import {
  formatCounselorSessionPillLabel,
  getSessionPresentation,
  sessionPresentationColors,
} from '../../utils/sessionPresentation'
import type { SessionMessage } from '../../types/message.types'

interface CounselorSessionChatCardProps {
  message: SessionMessage
  onViewDetails?: (msg: SessionMessage) => void
  onReschedule?: (msg: SessionMessage) => void
  onMarkAttendance?: (msg: SessionMessage) => void
}

export function CounselorSessionChatCard({
  message,
  onViewDetails,
  onReschedule,
  onMarkAttendance,
}: CounselorSessionChatCardProps) {
  const session = message.session
  const st = session.sessionStatus ?? 'pending'
  const hasAgreedTime = !!(session.agreedSlot?.date && session.agreedSlot?.time)
  const firstSlot = session.timeSlots?.[0]
  const displayDate = session.agreedSlot?.date ?? firstSlot?.date ?? ''
  const displayTime = session.agreedSlot?.time ?? firstSlot?.time ?? ''

  const resolvedStatus =
    st === 'completed' || st === 'missed' || st === 'cancelled'
      ? st
      : st === 'confirmed' || hasAgreedTime
        ? 'confirmed'
        : st

  const presentation = getSessionPresentation({ status: resolvedStatus, role: 'counselor' })
  const pillColors = sessionPresentationColors(presentation.variant)
  const scheduledTimeReached = isSessionScheduledTimeReached(
    displayDate && displayTime ? { date: displayDate, time: displayTime } : null,
  )

  const isScheduled = resolvedStatus === 'confirmed'
  const isInviteOpen = !['completed', 'missed', 'cancelled', 'confirmed'].includes(resolvedStatus)
  const showReschedule = !!onReschedule && (isInviteOpen || (isScheduled && scheduledTimeReached))

  return (
    <div className="max-w-[78%] rounded-2xl overflow-hidden border border-white/15 bg-linear-to-br from-aurora-blue to-aurora-purple p-4">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-md"
            style={{ backgroundColor: pillColors.bg, color: pillColors.text }}
          >
            {formatCounselorSessionPillLabel(presentation.pillLabel)}
          </span>
          <Calendar className="w-3.5 h-3.5 text-white/85" />
        </div>

        <p className="text-base font-bold text-white leading-tight">
          {session.title ?? 'Counseling Session'}
        </p>

        {displayDate ? (
          <div className="flex items-center gap-2 mt-2">
            <Calendar className="w-3.5 h-3.5 text-white/85" />
            <p className="text-[13px] text-white/90">
              {displayDate} • {displayTime || '—'}
            </p>
          </div>
        ) : null}

        {session.note ? (
          <p className="text-[12px] italic text-white/85 mt-2 line-clamp-2">&ldquo;{session.note}&rdquo;</p>
        ) : null}

        {presentation.subtitle ? (
          <p className="text-[11px] mt-2" style={{ color: pillColors.text }}>
            {presentation.subtitle}
          </p>
        ) : null}

        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => onViewDetails?.(message)}
            className={`rounded-[10px] py-2 text-[13px] font-bold bg-white/95 text-aurora-blue hover:bg-white transition-colors cursor-pointer ${
              showReschedule ? 'flex-1' : 'w-full'
            }`}
          >
            View Details
          </button>
          {showReschedule ? (
            <button
              type="button"
              onClick={() => onReschedule?.(message)}
              className="flex-1 rounded-[10px] py-2 text-[13px] font-semibold bg-transparent text-white border-2 border-white/90 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Reschedule
            </button>
          ) : null}
        </div>

        {scheduledTimeReached && onMarkAttendance && resolvedStatus === 'confirmed' ? (
          <button
            type="button"
            onClick={() => onMarkAttendance(message)}
            className="w-full mt-2 py-2 rounded-[10px] text-xs font-bold bg-white/15 border border-white/30 text-white cursor-pointer hover:bg-white/20"
          >
            Mark attendance
          </button>
        ) : null}

        <p className="text-[11px] text-white/70 mt-2 text-right">{message.time}</p>
    </div>
  )
}
