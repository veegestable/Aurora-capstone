import { Loader2 } from 'lucide-react'
import type { StudentCounselingOutcomeCounts } from '../../services/trusted-backend.service'

interface StudentCounselingHistorySummaryProps {
  counts: StudentCounselingOutcomeCounts | null
  loading?: boolean
}

export function StudentCounselingHistorySummary({
  counts,
  loading = false,
}: StudentCounselingHistorySummaryProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-3 rounded-xl border border-aurora-border bg-white/[0.03]">
        <Loader2 className="w-4 h-4 animate-spin text-aurora-blue" />
      </div>
    )
  }

  const completed = counts?.completed ?? 0
  const missed = counts?.missed ?? 0
  const withYouCompleted = counts?.withYouCompleted ?? 0
  const withYouMissed = counts?.withYouMissed ?? 0
  const showWithYou =
    withYouCompleted !== completed ||
    withYouMissed !== missed ||
    withYouCompleted > 0 ||
    withYouMissed > 0

  return (
    <div className="rounded-xl border border-aurora-border bg-white/[0.03] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white">Counseling history</p>
          <p className="text-[10px] text-aurora-text-muted mt-0.5 leading-snug">
            All completed and missed sessions on Aurora (every counselor)
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <span className="inline-flex items-center rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-2 py-1 text-[11px] font-bold text-emerald-300">
            {completed} completed
          </span>
          <span className="inline-flex items-center rounded-lg bg-orange-500/15 border border-orange-500/25 px-2 py-1 text-[11px] font-bold text-orange-300">
            {missed} missed
          </span>
        </div>
      </div>
      {showWithYou ? (
        <p className="text-[10px] text-aurora-text-sec mt-2">
          With you: {withYouCompleted} completed · {withYouMissed} missed
        </p>
      ) : null}
    </div>
  )
}
