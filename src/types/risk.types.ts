export type RiskLevel = 'HIGH RISK' | 'MEDIUM' | 'LOW RISK'

export type CaseSeverity = 'high' | 'medium' | 'low'

export type CaseStatus = 'open' | 'in_progress' | 'resolved'

export interface RiskStyleTokens {
  border: string
  badgeBg: string
  badgeBorder: string
  text: string
  label?: string
  dot?: string
  cardBg?: string
  ring?: string
}