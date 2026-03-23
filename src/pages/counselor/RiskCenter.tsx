import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { counselorService } from '../../services/counselor'
import { firestoreService } from '../../services/firebase-firestore'
import { AlertTriangle } from 'lucide-react'
import { RiskCaseCard, RiskCase } from '../../components/counselor/RiskCaseCard'
import type { CaseStatus, CaseSeverity } from '../../types/risk.types'
import { formatTimeAgo, deriveCaseSeverity, getTriggerFromMood } from '../../utils/riskHelpers'

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
