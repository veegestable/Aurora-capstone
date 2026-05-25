import { Calendar, Clock, AlertTriangle, CalendarX } from 'lucide-react'
import { LetterAvatar } from '../LetterAvatar'
import type { Session } from '../../types/session.types'
import type { StudentInfo } from '../../services/counselor'
import { formatCounselorStudentSubtitle } from '../../constants/student/programs'
import {
  canCounselorMarkSessionAttendance,
  computeSessionHistoryBadge,
  getConfirmedFinalSlot,
} from '../../utils/sessionScheduling'
import { formatSessionTimelineLine, formatSlotForDisplay } from '../../utils/sessionHistoryDisplay'
import { SessionHistoryBadgePill } from './SessionHistoryBadgePill'

interface SessionHistoryTimelineCardProps {
  session: Session
  student?: StudentInfo | null
  onPress: () => void
}

export function SessionHistoryTimelineCard({
  session,
  student,
  onPress,
}: SessionHistoryTimelineCardProps) {
  const studentName = student?.full_name?.trim() || 'Unknown student'
  const rawSlot = getConfirmedFinalSlot(session)
  const slot = formatSlotForDisplay(rawSlot) ?? rawSlot
  const badge = computeSessionHistoryBadge(session)
  const canMarkAttendance = canCounselorMarkSessionAttendance(session)

  const subtitle =
    formatCounselorStudentSubtitle({
      department: student?.department,
      program: student?.program,
      year_level: student?.yearLevel,
    }) || 'CCS'

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full text-left card-aurora border border-aurora-border p-4 mb-3 hover:border-aurora-blue/30 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <LetterAvatar
          name={studentName}
          size={48}
          avatarUrl={student?.avatar_url ?? undefined}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-base font-bold text-white truncate">{studentName}</p>
            <SessionHistoryBadgePill badge={badge} />
          </div>
          <p className="text-sm text-aurora-text-sec mb-2.5 truncate">{subtitle}</p>

          <p className="text-[11px] text-aurora-text-muted leading-relaxed mb-2">
            {(session.initiatedBy ?? 'student') === 'counselor' ? 'Invite sent' : 'Requested'}:{' '}
            {formatSessionTimelineLine(session.createdAt)}
          </p>

          {session.status === 'completed' && slot && (
            <div className="space-y-1.5 text-sm text-aurora-text-sec">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{slot.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{slot.time}</span>
              </div>
            </div>
          )}

          {session.status === 'missed' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-orange-300 text-sm font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Student did not attend
              </div>
              {slot?.time && (
                <div className="flex items-center gap-2 text-sm text-aurora-text-sec">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{slot.time}</span>
                </div>
              )}
            </div>
          )}

          {session.status === 'cancelled' && (
            <div className="flex items-center gap-2 text-sm text-aurora-text-muted">
              <CalendarX className="w-3.5 h-3.5 shrink-0" />
              <span>
                {session.cancelReason ?? 'Cancelled'}
                {slot?.date ? ` (${slot.date})` : ''}
              </span>
            </div>
          )}

          {(badge === 'reschedule' || badge === 'expired') && slot && (
            <div className="space-y-1.5">
              <p
                className={`text-sm font-semibold leading-snug ${
                  badge === 'expired' ? 'text-aurora-text-muted' : 'text-orange-300'
                }`}
              >
                {badge === 'expired'
                  ? 'Over 24h past scheduled time — expired. Mark attendance or record will be removed after 7 days.'
                  : 'Past scheduled time (within 24h) — needs rescheduling or mark attendance.'}
              </p>
              <div className="flex items-center gap-2 text-sm text-aurora-text-sec">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{slot.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-aurora-text-sec">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{slot.time}</span>
              </div>
              {canMarkAttendance && (
                <p className="text-xs font-semibold text-aurora-blue mt-2">Tap to mark attendance</p>
              )}
            </div>
          )}

          {(badge === 'pending' || badge === 'today') && slot && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-aurora-text-sec">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{slot.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-aurora-text-sec">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{slot.time}</span>
              </div>
              {canMarkAttendance && (
                <p className="text-xs font-semibold text-aurora-blue mt-2">Tap to mark attendance</p>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
