import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { counselorService } from '../../services/counselor'
import { firestoreService } from '../../services/firebase-firestore'
import {
  AlertTriangle, AlertCircle
} from 'lucide-react'
import { LetterAvatar } from '../../components/LetterAvatar'
import type { CaseStatus, CaseSeverity } from '../../types/risk.types'
import { formatTimeAgo, deriveCaseSeverity, getSeverityStyle, getTriggerFromMood } from '../../utils/riskHelpers'

interface RiskCase {
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

// Trigger Alert Box 
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

// Risk Case Card 
function RiskCaseCard({
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

// Main 
export default function RiskCenter() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<RiskCase[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const students = await counselorService.getStudents()
        if (cancelled) return

        const limit = Math.min(20, students.length)
        const casesWithMood = await Promise.all(
          students.slice(0, limit).map(async (s) => {
            try {
              const logs = await firestoreService.getMoodLogs(s.id)
              const latest = logs[0]
              const stress = latest?.stress_level
              const energy = latest?.energy_level
              const severity = deriveCaseSeverity(stress, energy)
              const { trigger, type } = getTriggerFromMood(stress, energy)
              return {
                id: s.id,
                name: s.full_name || 'Student',
                program: s.email,
                severity,
                timeAgo: latest?.log_date ? formatTimeAgo(new Date(latest.log_date)) : 'No logs',
                trigger,
                triggerType: type,
                status: 'open' as CaseStatus,
              }
            } catch {
              return {
                id: s.id,
                name: s.full_name || 'Student',
                program: s.email,
                severity: 'low' as CaseSeverity,
                timeAgo: 'No logs',
                trigger: 'No recent mood data.',
                triggerType: 'social' as const,
                status: 'open' as CaseStatus,
              }
            }
          })
        )

        if (cancelled) return
        setCases(
          casesWithMood.sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 }
            return order[a.severity] - order[b.severity]
          })
        )
      } catch {
        if (!cancelled) setCases([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  const handleStatusChange = (id: string, status: CaseStatus) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
  }

  const handleInvite = (_riskCase: RiskCase) => {
    // Navigate to messages — in the future, auto-create conversation
    navigate('/counselor/messages')
  }

  // Overview summary
  const overview = useMemo(() => [
    {
      label: 'High Risk',
      count: cases.filter((c) => c.severity === 'high').length,
      sub: 'Pending Review',
      dot: 'bg-red-500',
      border: 'border-red-500/25',
      bg: 'bg-red-500/[0.06]',
    },
    {
      label: 'Medium',
      count: cases.filter((c) => c.severity === 'medium').length,
      sub: 'In Progress',
      dot: 'bg-orange-500',
      border: 'border-orange-500/25',
      bg: 'bg-orange-500/[0.06]',
    },
    {
      label: 'Low Risk',
      count: cases.filter((c) => c.severity === 'low').length,
      sub: 'Monitored',
      dot: 'bg-amber-400',
      border: 'border-amber-400/25',
      bg: 'bg-amber-400/[0.04]',
    },
  ], [cases])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-aurora-primary-dark" />
        <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading">
          Risk Center
        </h2>
      </div>

      {/* Overview Cards */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-primary-dark/40 uppercase mb-3">
          Overview
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {overview.map((ov) => (
            <div
              key={ov.label}
              className={`min-w-[140px] flex-1 ${ov.bg} border ${ov.border} rounded-2xl p-4`}
            >
              <div className="flex items-center gap-1.5 mb-2.5">
                <div className={`w-2 h-2 rounded-full ${ov.dot}`} />
                <span className="text-aurora-primary-dark text-xs font-bold">{ov.label}</span>
              </div>
              <span className="text-3xl font-extrabold text-aurora-primary-dark">{ov.count}</span>
              <p className="text-xs text-aurora-primary-dark/50 mt-1">{ov.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Prioritized Cases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold text-aurora-primary-dark font-heading">
            Prioritized Cases
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-secondary-blue" />
            <span className="ml-3 text-aurora-primary-dark/50 text-sm">Loading...</span>
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle className="w-12 h-12 text-aurora-primary-dark/20 mx-auto mb-3" />
            <p className="text-aurora-primary-dark/50 text-sm">No risk cases to display.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {cases.map((c) => (
              <RiskCaseCard
                key={c.id}
                riskCase={c}
                onStatusChange={handleStatusChange}
                onInvite={handleInvite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
