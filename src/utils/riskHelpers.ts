import type { RiskLevel, CaseSeverity, RiskStyleTokens } from '../types/risk.types'

// Time Formatting
export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

// Risk Derivation
// Derive a display-level RiskLevel from mood data
export function deriveRiskLevel(stress?: number, energy?: number): RiskLevel {
  const s = stress ?? 5
  const e = energy ?? 5
  if (s >= 7 || e <= 2) return 'HIGH RISK'
  if (s >= 5 || e <= 4) return 'MEDIUM'
  return 'LOW RISK'
}

// Derive a data-level CaseSeverity from mood data
export function deriveCaseSeverity(stress?: number, energy?: number): CaseSeverity {
  const s = stress ?? 5
  const e = energy ?? 5
  if (s >= 7 || e <= 2) return 'high'
  if (s >= 5 || e <= 4) return 'medium'
  return 'low'
}

// Risk Styling
// Style tokens for Dashboard risk flags
export function getDashboardRiskStyle(risk: RiskLevel): RiskStyleTokens {
  switch (risk) {
    case 'HIGH RISK':
      return {
        border: 'border-l-red-500',
        badgeBg: 'bg-red-500/15',
        badgeBorder: 'border-red-500/30',
        text: 'text-red-500',
      }
    case 'MEDIUM':
      return {
        border: 'border-l-orange-500',
        badgeBg: 'bg-orange-500/15',
        badgeBorder: 'border-orange-500/30',
        text: 'text-orange-500',
      }
    case 'LOW RISK':
      return {
        border: 'border-l-emerald-500',
        badgeBg: 'bg-emerald-500/15',
        badgeBorder: 'border-emerald-500/30',
        text: 'text-emerald-500',
      }
  }
}

// Style tokens for RiskCenter severity cards
export function getSeverityStyle(severity: CaseSeverity): RiskStyleTokens {
  switch (severity) {
    case 'high':
      return {
        border: 'border-l-red-500',
        badgeBg: 'bg-red-500/15',
        badgeBorder: 'border-red-500/30',
        text: 'text-red-500',
        label: 'HIGH RISK',
        dot: 'bg-red-500',
        cardBg: 'bg-red-500/6',
      }
    case 'medium':
      return {
        border: 'border-l-orange-500',
        badgeBg: 'bg-orange-500/15',
        badgeBorder: 'border-orange-500/30',
        text: 'text-orange-500',
        label: 'MEDIUM RISK',
        dot: 'bg-orange-500',
        cardBg: 'bg-orange-500/6',
      }
    case 'low':
      return {
        border: 'border-l-amber-400',
        badgeBg: 'bg-amber-400/12',
        badgeBorder: 'border-amber-400/30',
        text: 'text-amber-500',
        label: 'LOW RISK',
        dot: 'bg-amber-400',
        cardBg: 'bg-amber-400/4',
      }
  }
}

// Style tokens for Student directory cards
export function getStudentRiskStyle(risk: RiskLevel): RiskStyleTokens {
  switch (risk) {
    case 'HIGH RISK':
      return {
        border: 'border-l-red-500',
        badgeBg: 'bg-red-500/15',
        badgeBorder: 'border-red-500/30',
        text: 'text-red-500',
        ring: 'ring-red-500/40',
      }
    case 'MEDIUM':
      return {
        border: 'border-l-orange-500',
        badgeBg: 'bg-orange-500/15',
        badgeBorder: 'border-orange-500/30',
        text: 'text-orange-500',
        ring: 'ring-orange-500/40',
      }
    case 'LOW RISK':
      return {
        border: 'border-l-aurora-secondary-blue',
        badgeBg: 'bg-aurora-secondary-blue/15',
        badgeBorder: 'border-aurora-secondary-blue/30',
        text: 'text-aurora-secondary-blue',
        ring: 'ring-aurora-secondary-blue/40',
      }
  }
}

// Derive trigger text and type from mood data
export function getTriggerFromMood(stress?: number, energy?: number) {
  const s = stress ?? 5
  const e = energy ?? 5
  if (s >= 7 || e <= 2)
    return { trigger: 'High stress or very low energy detected in recent mood log.', type: 'critical' as const }
  if (s >= 5 || e <= 4)
    return { trigger: 'Elevated stress or low energy recorded in mood check-in.', type: 'mood' as const }
  return { trigger: 'Student monitored. Mood patterns within normal range.', type: 'social' as const }
}