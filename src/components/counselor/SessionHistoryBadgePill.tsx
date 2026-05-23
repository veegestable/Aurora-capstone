import {
  getSessionHistoryBadgePresentation,
  sessionPresentationColors,
} from '../../utils/sessionPresentation'
import type { SessionHistoryBadge } from '../../utils/sessionScheduling'

export function SessionHistoryBadgePill({ badge }: { badge: SessionHistoryBadge }) {
  const p = getSessionHistoryBadgePresentation(badge)
  const colors = sessionPresentationColors(p.variant)
  return (
    <span
      className="shrink-0 text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-lg border"
      style={{ color: colors.text, borderColor: colors.text, backgroundColor: colors.bg }}
    >
      {p.counselorPillUpper}
    </span>
  )
}
