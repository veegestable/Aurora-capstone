import { Calendar, Clock, FileText, AlertCircle } from 'lucide-react'
import type { Session } from '../../types/session.types'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  requested:  { label: 'Requested',    bg: 'bg-aurora-amber/20',  text: 'text-aurora-amber' },
  pending:    { label: 'Pending',      bg: 'bg-aurora-amber/20',  text: 'text-aurora-amber' },
  confirmed:  { label: 'Confirmed',    bg: 'bg-aurora-green/20',  text: 'text-aurora-green' },
  completed:  { label: 'Completed',    bg: 'bg-aurora-green/20',  text: 'text-aurora-green' },
  cancelled:  { label: 'Cancelled',    bg: 'bg-aurora-red/20',    text: 'text-aurora-red' },
  missed:     { label: 'Missed',       bg: 'bg-aurora-red/20',    text: 'text-aurora-red' },
  expired:    { label: 'Expired',      bg: 'bg-white/10',         text: 'text-aurora-text-muted' },
  needs_rescheduling: { label: 'Reschedule', bg: 'bg-aurora-purple/20', text: 'text-aurora-purple' },
  rescheduled: { label: 'Rescheduled', bg: 'bg-aurora-blue/20',   text: 'text-aurora-blue' },
}

interface SessionCardProps {
  session: Session
  peerName?: string
  onAction?: () => void
  actionLabel?: string
}

export function SessionCard({ session, peerName, onAction, actionLabel }: SessionCardProps) {
  const config = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.pending
  const slot = session.finalSlot ?? session.confirmedSlot ?? session.proposedSlots?.[0]

  return (
    <div className="card-aurora border border-aurora-border p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-aurora-blue/20 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4 text-aurora-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {session.initiatedBy === 'student' ? 'Session Request' : 'Session Invite'}
          </p>
          {peerName && (
            <p className="text-xs text-aurora-text-sec truncate">{peerName}</p>
          )}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md shrink-0 ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>

      {/* Time */}
      {slot && (
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-aurora-text-muted shrink-0" />
          <span className="text-xs text-aurora-text-sec">
            {slot.date}{slot.time ? ` at ${slot.time}` : ''}
          </span>
        </div>
      )}

      {/* Note */}
      {session.studentRequestNote && (
        <div className="flex items-start gap-2 mb-3">
          <FileText className="w-3.5 h-3.5 text-aurora-text-muted mt-0.5 shrink-0" />
          <p className="text-xs text-aurora-text-sec leading-relaxed line-clamp-2">
            {session.studentRequestNote}
          </p>
        </div>
      )}

      {/* Attendance & Cancel Reason */}
      {(session.attendanceNote || session.cancelReason) && (
        <div className="mt-3 pt-3 border-t border-aurora-border space-y-2">
          {session.attendanceNote && (
            <div className="flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-aurora-text-muted mt-0.5 shrink-0" />
              <p className="text-xs text-aurora-text-sec leading-relaxed">
                <span className="font-semibold text-white">Attendance: </span>
                {session.attendanceNote}
              </p>
            </div>
          )}
          {session.cancelReason && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-aurora-text-muted mt-0.5 shrink-0" />
              <p className="text-xs text-aurora-text-sec leading-relaxed">
                <span className="font-semibold text-white">Reason: </span>
                {session.cancelReason}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action */}
      {onAction && actionLabel && (
        <div className="mt-3">
          <button
            onClick={onAction}
            className="w-full btn-aurora py-2.5 text-sm"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  )
}