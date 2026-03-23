import { AlertCircle } from 'lucide-react'
import { LetterAvatar } from '../LetterAvatar'
import { getSeverityStyle } from '../../utils/riskHelpers'
import type { CaseStatus, CaseSeverity } from '../../types/risk.types'

export interface RiskCase {
  id: string
  name: string
  program: string
  severity: CaseSeverity
  timeAgo: string
  trigger: string
  triggerType: 'critical' | 'mood' | 'social'
  status: CaseStatus
  handledBy?: string
}

function TriggerBox({ type, message }: { type: RiskCase['triggerType']; message: string }) {
  const isCritical = type === 'critical'
  return (
    <div
      className={`flex items-start gap-3 rounded-xl p-3.5 my-3 border ${
        isCritical
          ? 'bg-red-500/6 border-red-500/20 border-l-[3px] border-l-red-500'
          : 'bg-aurora-primary-dark/3 border-aurora-primary-light/20'
      }`}
    >
      {isCritical && <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
      <p className={`text-sm leading-relaxed ${isCritical ? 'text-aurora-primary-dark font-semibold' : 'text-aurora-primary-dark/60'}`}>
        {message}
      </p>
    </div>
  )
}

export function RiskCaseCard({
  riskCase,
  onStatusChange,
  onInvite,
}: {
  riskCase: RiskCase
  onStatusChange: (id: string, status: CaseStatus) => void
  onInvite: (riskCase: RiskCase) => void
}) {
  const sev = getSeverityStyle(riskCase.severity)
  const isLow = riskCase.severity === 'low'
  const isInProgress = riskCase.status === 'in_progress'

  return (
    <div className={`card-aurora border-l-4 ${sev.border} overflow-hidden`}>
      {/* Student Header */}
      <div className="flex items-center gap-3 mb-1">
        <LetterAvatar name={riskCase.name} size={46} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-aurora-primary-dark text-sm">{riskCase.name}</span>
            <span
              className={`text-[10px] font-extrabold tracking-wide px-2 py-0.5 rounded-full border ${sev.badgeBg} ${sev.badgeBorder} ${sev.text}`}
            >
              {sev.label}
            </span>
          </div>
          <p className="text-xs text-aurora-primary-dark/50 mt-0.5">{riskCase.program}</p>
        </div>
        <span className="text-xs text-aurora-primary-dark/40 shrink-0">{riskCase.timeAgo}</span>
      </div>

      {/* Trigger */}
      <TriggerBox type={riskCase.triggerType} message={riskCase.trigger} />

      {/* Handler note */}
      {riskCase.handledBy && (
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-orange-500 text-xs font-semibold">
            Currently handled by {riskCase.handledBy}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2.5">
        {isLow ? (
          <>
            <button
              className="flex-1 py-2.5 rounded-xl border border-aurora-primary-light/30 text-sm font-semibold text-aurora-primary-dark/60 hover:bg-aurora-primary-light/10 transition-colors cursor-pointer"
              aria-label="Review risk case"
            >
              Review
            </button>
            <button
              className="flex-1 py-2.5 rounded-xl border border-aurora-primary-light/30 text-sm font-semibold text-aurora-primary-dark/60 hover:bg-aurora-primary-light/10 transition-colors cursor-pointer"
              aria-label="Dismiss risk case"
            >
              Dismiss
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onStatusChange(riskCase.id, 'in_progress')}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                isInProgress
                  ? 'border-aurora-primary-light/20 text-aurora-primary-dark/40 bg-aurora-primary-dark/3'
                  : 'border-aurora-primary-light/30 text-aurora-primary-dark/60 hover:bg-aurora-primary-light/10'
              }`}
              aria-label={isInProgress ? 'Currently in progress' : 'Mark as in progress'}
            >
              {isInProgress ? 'In Progress' : 'Mark In Progress'}
            </button>
            <button
              onClick={() => onInvite(riskCase)}
              className="flex-1 py-2.5 rounded-xl bg-aurora-secondary-blue text-white text-sm font-bold shadow-md hover:bg-aurora-secondary-dark-blue transition-colors cursor-pointer"
              aria-label={`Invite ${riskCase.name} to a session`}
            >
              Invite
            </button>
          </>
        )}
      </div>
    </div>
  )
}