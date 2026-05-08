import { useState } from 'react'
import { Calendar, Clock, FileText, Hash, Mail, X, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { LetterAvatar } from '../LetterAvatar'
import { sessionsService } from '../../services/sessions'
import { useAuth } from '../../contexts/AuthContext'
import type { Session, SessionStatus } from '../../types/session.types'
import type { StudentInfo } from '../../services/counselor'
import { formatCounselorStudentSubtitle } from '../../constants/student/programs'

interface SessionHistoryDetailModalProps {
  open: boolean
  session: Session | null
  student?: StudentInfo | null
  onClose: () => void
  onUpdated?: (newStatus: SessionStatus) => void
}

const STATUS_PILL: Record<string, { label: string; bg: string; text: string }> = {
  pending:           { label: 'Pending review',   bg: 'bg-aurora-amber/20',  text: 'text-aurora-amber' },
  requested:         { label: 'New request',      bg: 'bg-aurora-amber/20',  text: 'text-aurora-amber' },
  confirmed:         { label: 'Accepted',         bg: 'bg-aurora-green/20',  text: 'text-aurora-green' },
  completed:         { label: 'Completed',        bg: 'bg-aurora-blue/20',   text: 'text-aurora-blue' },
  missed:            { label: 'Missed',           bg: 'bg-orange-500/20',    text: 'text-orange-300' },
  cancelled:         { label: 'Cancelled',        bg: 'bg-aurora-red/20',    text: 'text-aurora-red' },
  rescheduled:       { label: 'Rescheduled',      bg: 'bg-aurora-purple/20', text: 'text-aurora-purple' },
  needs_rescheduling:{ label: 'Needs reschedule', bg: 'bg-orange-500/20',    text: 'text-orange-300' },
  expired:           { label: 'Expired',          bg: 'bg-white/10',         text: 'text-aurora-text-muted' },
}

function formatDateTime(d: Date | undefined) {
  if (!d) return '—'
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export function SessionHistoryDetailModal({
  open,
  session,
  student,
  onClose,
  onUpdated,
}: SessionHistoryDetailModalProps) {
  const { user } = useAuth()
  const [busy, setBusy] = useState<SessionStatus | null>(null)

  if (!open || !session) return null

  const pill = STATUS_PILL[session.status] ?? STATUS_PILL.pending
  const slot = session.finalSlot ?? session.confirmedSlot ?? session.proposedSlots?.[0]
  const studentName = student?.full_name?.trim() || 'Unknown student'
  const subtitle =
    formatCounselorStudentSubtitle({
      department: student?.department,
      program: student?.program,
      year_level: student?.yearLevel,
    }) || 'CCS'

  const canMarkAttendance =
    session.status === 'confirmed' ||
    session.status === 'pending' ||
    session.status === 'needs_rescheduling'

  const apply = async (newStatus: SessionStatus, reasonOrNote?: string) => {
    if (!user?.id) return
    setBusy(newStatus)
    try {
      await sessionsService.updateSessionStatus({
        sessionId: session.id,
        status: newStatus,
        attendanceNote: newStatus === 'completed' || newStatus === 'missed' ? reasonOrNote : undefined,
        cancelReason: newStatus === 'cancelled' ? reasonOrNote : undefined,
        performedBy: user.id,
        performedByRole: user.role ?? 'counselor',
      })
      onUpdated?.(newStatus)
      onClose()
    } catch (e) {
      console.error('Failed to update session status:', e)
      alert('Could not update session status. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl card-aurora border border-aurora-border p-6 max-h-[88vh] overflow-y-auto"
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

        <span className={`inline-block text-[11px] font-extrabold tracking-wider px-3 py-1 rounded-md mb-5 ${pill.bg} ${pill.text}`}>
          {pill.label}
        </span>

        <DetailRow icon={<Calendar className="w-4 h-4 text-aurora-blue" />} label="Date">
          {slot?.date ?? '—'}
        </DetailRow>

        <DetailRow icon={<Clock className="w-4 h-4 text-aurora-blue" />} label="Time">
          {slot?.time ?? '—'}
        </DetailRow>

        <DetailRow icon={<Calendar className="w-4 h-4 text-aurora-blue" />} label="Invite sent">
          {formatDateTime(session.createdAt)}
        </DetailRow>

        <DetailRow icon={<Hash className="w-4 h-4 text-aurora-blue" />} label="Session ID">
          <span className="font-mono text-xs text-aurora-text-sec break-all">{session.id}</span>
        </DetailRow>

        <DetailRow icon={<FileText className="w-4 h-4 text-aurora-blue" />} label="Description">
          {session.studentRequestNote?.trim()
            ? <span className="text-sm text-aurora-text-sec leading-relaxed">{session.studentRequestNote}</span>
            : <span className="text-sm text-aurora-text-muted italic">No note added</span>}
        </DetailRow>

        {(session.attendanceNote || session.cancelReason) && (
          <div className="mt-3 pt-3 border-t border-aurora-border space-y-2">
            {session.attendanceNote && (
              <p className="text-xs text-aurora-text-sec">
                <span className="font-bold text-white">Attendance: </span>
                {session.attendanceNote}
              </p>
            )}
            {session.cancelReason && (
              <p className="text-xs text-aurora-text-sec">
                <span className="font-bold text-white">Reason: </span>
                {session.cancelReason}
              </p>
            )}
          </div>
        )}

        {canMarkAttendance && (
          <div className="mt-6 pt-4 border-t border-aurora-border">
            <p className="text-[11px] font-extrabold tracking-wider text-aurora-text-muted uppercase mb-3">
              Mark attendance
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <AttendanceButton
                icon={<CheckCircle2 className="w-4 h-4" />}
                label="Completed"
                color="bg-aurora-green/20 border-aurora-green/40 text-aurora-green hover:bg-aurora-green/30"
                busy={busy === 'completed'}
                disabled={!!busy}
                onClick={() => apply('completed', 'Marked completed by counselor.')}
              />
              <AttendanceButton
                icon={<AlertTriangle className="w-4 h-4" />}
                label="Missed"
                color="bg-orange-500/15 border-orange-500/40 text-orange-300 hover:bg-orange-500/25"
                busy={busy === 'missed'}
                disabled={!!busy}
                onClick={() => apply('missed', 'Student did not show up.')}
              />
              <AttendanceButton
                icon={<XCircle className="w-4 h-4" />}
                label="Cancel"
                color="bg-aurora-red/15 border-aurora-red/40 text-aurora-red hover:bg-aurora-red/25"
                busy={busy === 'cancelled'}
                disabled={!!busy}
                onClick={() => apply('cancelled', 'Cancelled by counselor.')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
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

function AttendanceButton({
  icon, label, color, busy, disabled, onClick,
}: {
  icon: React.ReactNode
  label: string
  color: string
  busy: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  )
}