import { Calendar, Clock, FileText, MapPin, X } from 'lucide-react'
import { ModalPortal } from '../common/ModalPortal'
import type { SessionMessage } from '../../types/message.types'

interface SessionChatDetailsModalProps {
  open: boolean
  message: SessionMessage | null
  onClose: () => void
}

const STATUS_PILL: Record<string, { label: string; bg: string; text: string }> = {
  pending:      { label: 'Awaiting student',   bg: 'bg-aurora-amber/20',  text: 'text-aurora-amber' },
  requested:    { label: 'Requested',          bg: 'bg-aurora-amber/20',  text: 'text-aurora-amber' },
  confirmed:    { label: 'Accepted',           bg: 'bg-aurora-green/20',  text: 'text-aurora-green' },
  completed:    { label: 'Completed',          bg: 'bg-aurora-blue/20',   text: 'text-aurora-blue' },
  missed:       { label: 'Missed',             bg: 'bg-orange-500/20',    text: 'text-orange-300' },
  cancelled:    { label: 'Cancelled',          bg: 'bg-aurora-red/20',    text: 'text-aurora-red' },
  rescheduled:  { label: 'Rescheduled',        bg: 'bg-aurora-purple/20', text: 'text-aurora-purple' },
  expired:      { label: 'Expired',            bg: 'bg-white/10',         text: 'text-aurora-text-muted' },
}

export function SessionChatDetailsModal({ open, message, onClose }: SessionChatDetailsModalProps) {
  if (!open || !message) return null

  const session = message.session
  const status = session.sessionStatus ?? 'pending'
  const pill = STATUS_PILL[status] ?? STATUS_PILL.pending
  const displaySlot = session.agreedSlot
  const firstSlot = session.timeSlots?.[0]
  const displayDate = session.date ?? firstSlot?.date ?? ''
  const displayTime = session.time ?? firstSlot?.time ?? ''
  const slots = session.timeSlots ?? []

  return (
    <ModalPortal open>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 lg:pb-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-lg card-aurora border border-aurora-border p-6 max-h-[min(85vh,calc(100dvh-6rem))] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">Session details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-white/5 text-aurora-text-sec transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <span className={`inline-block text-[11px] font-extrabold tracking-wider px-3 py-1 rounded-md mb-5 ${pill.bg} ${pill.text}`}>
          {pill.label}
        </span>

        <DetailRow icon={<Calendar className="w-4 h-4 text-aurora-blue" />} label="Session title">
          {session.title ?? 'Counseling Session'}
        </DetailRow>

        {displaySlot ? (
          <DetailRow icon={<Clock className="w-4 h-4 text-aurora-blue" />} label="Confirmed time">
            {displaySlot.date} at {displaySlot.time}
          </DetailRow>
        ) : slots.length === 0 && displayDate ? (
          <DetailRow icon={<Clock className="w-4 h-4 text-aurora-blue" />} label="Scheduled time">
            {displayDate} at {displayTime}
          </DetailRow>
        ) : null}

        {slots.length > 0 && (
          <DetailRow icon={<Calendar className="w-4 h-4 text-aurora-blue" />} label="Proposed times">
            <div className="space-y-1">
              {slots.map((s, i) => (
                <p key={i} className="text-[14px] text-white/90">
                  {s.date} — {s.time}
                </p>
              ))}
            </div>
          </DetailRow>
        )}

        <DetailRow icon={<MapPin className="w-4 h-4 text-aurora-blue" />} label="Location">
          Office of Guidance and Counseling (OGC)
        </DetailRow>

        <DetailRow icon={<FileText className="w-4 h-4 text-aurora-blue" />} label="Note">
          {session.note?.trim() ? (
            <p className="text-sm text-aurora-text-sec leading-relaxed">{session.note}</p>
          ) : (
            <p className="text-sm text-aurora-text-muted italic">No note added</p>
          )}
        </DetailRow>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-3 rounded-xl bg-aurora-blue text-white font-bold hover:bg-blue-600 transition-colors cursor-pointer"
        >
          Done
        </button>
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
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[11px] font-extrabold tracking-wider text-aurora-text-muted uppercase">
          {label}
        </p>
      </div>
      <div className="pl-6 text-[15px] font-semibold text-white">{children}</div>
    </div>
  )
}