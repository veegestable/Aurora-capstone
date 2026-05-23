import { Check, X, RotateCcw } from 'lucide-react'
import { ModalPortal } from '../common/ModalPortal'
import { LetterAvatar } from '../LetterAvatar'

export type AttendanceStatus = 'showed_up' | 'did_not_show' | 'needs_rescheduling'

interface SessionAttendanceModalProps {
  open: boolean
  studentName: string
  studentAvatar?: string
  sessionDate: string
  sessionTime: string
  busy?: boolean
  onClose: () => void
  onMarkLater?: () => void
  onMarkStatus: (status: AttendanceStatus) => void
}

const OPTIONS: Array<{
  status: AttendanceStatus
  label: string
  icon: typeof Check
  primary?: boolean
}> = [
  { status: 'showed_up', label: 'Showed Up', icon: Check, primary: true },
  { status: 'did_not_show', label: 'Did Not Show Up', icon: X },
  { status: 'needs_rescheduling', label: 'Needs Rescheduling', icon: RotateCcw },
]

export function SessionAttendanceModal({
  open,
  studentName,
  studentAvatar,
  sessionDate,
  sessionTime,
  busy = false,
  onClose,
  onMarkLater,
  onMarkStatus,
}: SessionAttendanceModalProps) {
  if (!open) return null

  return (
    <ModalPortal open>
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm pb-16 sm:pb-0"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-aurora-card border border-aurora-border rounded-t-3xl sm:rounded-2xl p-6 mb-0 sm:mb-0"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="w-10 h-1 rounded-full bg-aurora-border mx-auto mb-4 sm:hidden" />

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-aurora-blue/15 flex items-center justify-center mb-3">
            <Check className="w-6 h-6 text-aurora-blue" />
          </div>
          <h2 className="text-lg font-extrabold text-white">Session Attendance</h2>
          <p className="text-sm text-aurora-text-sec mt-1">Post-session verification.</p>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl border border-aurora-border bg-[#12152e] mb-5">
          <LetterAvatar name={studentName} size={56} avatarUrl={studentAvatar} />
          <div className="text-left min-w-0">
            <p className="font-bold text-white truncate">{studentName}</p>
            <p className="text-xs text-aurora-text-sec mt-0.5">
              {sessionDate}
              {sessionTime ? ` · ${sessionTime}` : ''}
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {OPTIONS.map(({ status, label, icon: Icon, primary }) => (
            <button
              key={status}
              type="button"
              disabled={busy}
              onClick={() => onMarkStatus(status)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer disabled:opacity-60 ${
                primary
                  ? 'bg-aurora-blue text-white hover:bg-blue-600'
                  : 'border-2 border-aurora-border text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {onMarkLater ? (
          <button
            type="button"
            disabled={busy}
            onClick={onMarkLater}
            className="w-full py-2.5 text-sm font-semibold text-aurora-text-sec cursor-pointer hover:text-white"
          >
            Mark later
          </button>
        ) : null}
        </div>
      </div>
    </ModalPortal>
  )
}
