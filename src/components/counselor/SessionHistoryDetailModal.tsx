import { Calendar, Clock, FileText, Hash, Mail, X, AlertTriangle } from 'lucide-react'
import { ModalPortal } from '../common/ModalPortal'
import { LetterAvatar } from '../LetterAvatar'
import type { Session } from '../../types/session.types'
import type { StudentInfo } from '../../services/counselor'
import { formatCounselorStudentSubtitle } from '../../constants/student/programs'
import {
  canCounselorMarkSessionAttendance,
  computeSessionHistoryBadge,
  getAgreedSessionSlot,
} from '../../utils/sessionScheduling'
import {
  getSessionHistoryBadgePresentation,
  sessionPresentationColors,
} from '../../utils/sessionPresentation'
import { formatSessionTimelineLine, formatSlotForDisplay } from '../../utils/sessionHistoryDisplay'

interface SessionHistoryDetailModalProps {
  open: boolean
  session: Session | null
  student?: StudentInfo | null
  onClose: () => void
  onMarkAttendance?: () => void
}

export function SessionHistoryDetailModal({
  open,
  session,
  student,
  onClose,
  onMarkAttendance,
}: SessionHistoryDetailModalProps) {
  if (!open || !session) return null

  const rawSlot = getAgreedSessionSlot(session) ?? session.proposedSlots?.[0]
  const slotDisplay = formatSlotForDisplay(rawSlot)
  const badge = computeSessionHistoryBadge(session)
  const historyPresentation = getSessionHistoryBadgePresentation(badge)
  const badgeColors = sessionPresentationColors(historyPresentation.variant)
  const canMarkAttendance = canCounselorMarkSessionAttendance(session)

  const studentName = student?.full_name?.trim() || 'Unknown student'
  const subtitle =
    formatCounselorStudentSubtitle({
      department: student?.department,
      program: student?.program,
      year_level: student?.yearLevel,
    }) || 'CCS'

  const dateStr = slotDisplay?.date ?? rawSlot?.date ?? '—'
  const timeStr = slotDisplay?.time ?? rawSlot?.time ?? '—'

  return (
    <ModalPortal open>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 lg:pb-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-xl card-aurora border border-aurora-border p-6 max-h-[min(88vh,calc(100dvh-6rem))] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-start justify-between mb-5 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <LetterAvatar name={studentName} size={56} avatarUrl={student?.avatar_url ?? undefined} />
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-white truncate">{studentName}</p>
              <p className="text-xs text-aurora-text-sec truncate">{subtitle}</p>
              {student?.email && (
                <p className="flex items-center gap-1 text-[11px] text-[#C9D8FF] mt-0.5 truncate">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{student.email}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-white/5 text-aurora-text-sec transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <span
          className="inline-block text-[11px] font-extrabold tracking-wider px-3 py-1 rounded-md mb-2"
          style={{ backgroundColor: badgeColors.bg, color: badgeColors.text }}
        >
          {historyPresentation.counselorPillUpper}
        </span>
        {historyPresentation.hint && (
          <p className="text-xs text-aurora-text-sec mb-5">{historyPresentation.hint}</p>
        )}

        <DetailRow icon={<Calendar className="w-4 h-4 text-aurora-blue" />} label="Date">
          {dateStr}
        </DetailRow>

        <DetailRow icon={<Clock className="w-4 h-4 text-aurora-blue" />} label="Time">
          {timeStr}
        </DetailRow>

        <DetailRow
          icon={<Clock className="w-4 h-4 text-aurora-text-sec" />}
          label={(session.initiatedBy ?? 'student') === 'counselor' ? 'Invite sent' : 'Requested'}
        >
          {formatSessionTimelineLine(session.createdAt)}
        </DetailRow>

        <DetailRow icon={<Hash className="w-4 h-4 text-aurora-blue" />} label="Session ID">
          <span className="font-mono text-xs text-aurora-text-sec break-all">{session.id}</span>
        </DetailRow>

        <DetailRow icon={<FileText className="w-4 h-4 text-aurora-blue" />} label="Description">
          {session.studentRequestNote?.trim() ? (
            <span className="text-sm text-aurora-text-sec leading-relaxed font-normal">
              {session.studentRequestNote}
            </span>
          ) : (
            <span className="text-sm text-aurora-text-muted italic font-normal">No note added</span>
          )}
        </DetailRow>

        {session.preferredTimeFromStudent && (
          <DetailRow icon={<FileText className="w-4 h-4 text-aurora-blue" />} label="Student requested">
            {session.preferredTimeFromStudent}
          </DetailRow>
        )}

        {session.status === 'missed' && (
          <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-aurora-red/10 border border-aurora-red/20">
            <AlertTriangle className="w-4 h-4 text-aurora-red shrink-0" />
            <p className="text-sm font-semibold text-aurora-red">Student did not show up</p>
          </div>
        )}

        {session.status === 'completed' && session.attendanceNote && (
          <DetailRow icon={<FileText className="w-4 h-4 text-aurora-green" />} label="Note">
            <span className="text-sm text-aurora-text-sec font-normal">{session.attendanceNote}</span>
          </DetailRow>
        )}

        {(session.cancelReason && session.status === 'cancelled') && (
          <div className="mt-3 pt-3 border-t border-aurora-border">
            <p className="text-xs text-aurora-text-sec">
              <span className="font-bold text-white">Reason: </span>
              {session.cancelReason}
            </p>
          </div>
        )}

        {canMarkAttendance && onMarkAttendance && (
          <div className="mt-6 pt-4 border-t border-aurora-border">
            <button
              type="button"
              onClick={onMarkAttendance}
              className="w-full py-3 rounded-xl bg-aurora-blue text-white font-bold text-sm hover:bg-aurora-blue/90 transition-colors cursor-pointer"
            >
              Mark attendance
            </button>
            <p className="text-xs text-aurora-text-muted text-center mt-2">
              Available after the scheduled session time.
            </p>
          </div>
        )}
        </div>
      </div>
    </ModalPortal>
  )
}

function DetailRow({
  icon,
  label,
  children,
}: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <p className="text-[11px] font-extrabold tracking-wider text-aurora-text-muted uppercase">
          {label}
        </p>
      </div>
      <div className="pl-6 text-[15px] font-semibold text-white">{children}</div>
    </div>
  )
}
