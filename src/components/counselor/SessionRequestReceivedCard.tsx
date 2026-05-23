import { useState } from 'react'
import { Calendar, FileText, Check, Clock, ChevronRight, X } from 'lucide-react'
import {
  formatCounselorSessionPillLabel,
  getSessionPresentation,
  sessionPresentationColors,
} from '../../utils/sessionPresentation'

export interface SessionRequestReceivedData {
  sessionId: string
  title?: string
  preferredTime?: string
  note: string
  status: string
  isExpired?: boolean
}

interface SessionRequestReceivedCardProps {
  data: SessionRequestReceivedData
  onAccept?: () => void
  onProposeNewTime?: () => void
  isFromMe?: boolean
}

export function SessionRequestReceivedCard({
  data,
  onAccept,
  onProposeNewTime,
  isFromMe = false,
}: SessionRequestReceivedCardProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  const status = data.status
  const isExpired = data.isExpired ?? false
  const isNeedsRescheduling = status === 'needs_rescheduling'
  const canAct =
    !isExpired &&
    !['cancelled'].includes(status) &&
    ['pending', 'requested', 'needs_rescheduling'].includes(status)

  const presentation = getSessionPresentation({
    status,
    role: 'counselor',
    isExpired,
  })
  const pillColors = sessionPresentationColors(presentation.variant)
  const pillLabel = formatCounselorSessionPillLabel(presentation.pillLabel)

  const showAccept = !!data.preferredTime && !!onAccept && !isNeedsRescheduling && canAct
  const showPropose = !!onProposeNewTime && canAct
  const hasDetail = !!(data.preferredTime?.trim() || data.note?.trim())

  return (
    <>
      <div
        className={`max-w-[340px] w-full rounded-2xl border border-aurora-border bg-[#12152e] p-4 ${
          isFromMe ? 'rounded-br-md' : 'rounded-bl-md'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full bg-aurora-blue/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-aurora-blue" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-white">{data.title || 'Session Request'}</p>
              <span
                className="inline-block mt-1.5 text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-md"
                style={{ backgroundColor: pillColors.bg, color: pillColors.text }}
              >
                {pillLabel}
              </span>
              {presentation.subtitle ? (
                <p className="text-xs text-aurora-text-sec mt-1 leading-snug">{presentation.subtitle}</p>
              ) : null}
            </div>
          </div>
          {hasDetail ? (
            <button
              type="button"
              onClick={() => setDetailOpen(true)}
              className="p-1 cursor-pointer hover:opacity-70"
              aria-label="View full session details"
            >
              <ChevronRight className="w-5 h-5 text-aurora-blue" />
            </button>
          ) : null}
        </div>

        {data.preferredTime ? (
          <div className="flex items-center gap-2 text-sm mb-2">
            <Calendar className="w-3.5 h-3.5 text-aurora-text-sec shrink-0" />
            <span className="text-aurora-text-muted text-xs w-24 shrink-0">Preferred time</span>
            <span className={`text-white truncate ${isExpired ? 'text-aurora-text-muted' : ''}`}>
              {data.preferredTime}
            </span>
          </div>
        ) : null}

        {data.note ? (
          <div className="flex gap-2 mb-3">
            <FileText className="w-3.5 h-3.5 text-aurora-text-sec shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs text-aurora-text-muted mb-0.5">Student note</p>
              <p className={`text-sm text-aurora-text-sec line-clamp-3 ${isExpired ? 'text-aurora-text-muted' : ''}`}>
                {data.note}
              </p>
            </div>
          </div>
        ) : null}

        {(showAccept || showPropose) && (
          <div className="flex gap-2 mt-1">
            {showAccept ? (
              <button
                type="button"
                onClick={onAccept}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-aurora-blue text-white text-xs font-bold cursor-pointer hover:bg-blue-600"
              >
                <Check className="w-4 h-4" />
                Accept
              </button>
            ) : null}
            {showPropose ? (
              <button
                type="button"
                onClick={onProposeNewTime}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] border-2 border-aurora-blue text-aurora-blue text-xs font-bold cursor-pointer hover:bg-aurora-blue/10 ${
                  showAccept ? 'flex-1' : 'flex-1 w-full'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                {isNeedsRescheduling ? 'Reschedule' : 'Propose New Time'}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {detailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetailOpen(false)}
        >
          <div
            className="w-full max-w-md bg-aurora-card border border-aurora-border rounded-t-3xl sm:rounded-2xl p-5 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-aurora-border mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">Session details</h3>
              <button type="button" onClick={() => setDetailOpen(false)} aria-label="Close">
                <X className="w-5 h-5 text-aurora-text-sec" />
              </button>
            </div>
            <p className="text-sm text-aurora-text-muted text-center mb-4">
              {data.title || 'Session Request'}
            </p>
            {data.preferredTime?.trim() ? (
              <div className="rounded-xl border border-aurora-border bg-[#12152e] p-3.5 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-aurora-blue" />
                  <p className="text-xs font-bold text-aurora-text-sec uppercase tracking-wide">
                    Preferred time
                  </p>
                </div>
                <p className="text-sm text-white">{data.preferredTime.trim()}</p>
              </div>
            ) : null}
            {data.note?.trim() ? (
              <div className="rounded-xl border border-aurora-border bg-[#12152e] p-3.5 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-aurora-blue" />
                  <p className="text-xs font-bold text-aurora-text-sec uppercase tracking-wide">
                    Student note
                  </p>
                </div>
                <p className="text-sm text-white leading-relaxed">{data.note.trim()}</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="w-full py-3 rounded-xl bg-aurora-blue text-white font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  )
}
