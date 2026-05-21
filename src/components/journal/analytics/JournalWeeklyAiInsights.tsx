import { Sparkles, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import type { JournalAnalyticsModel } from '../../../hooks/useJournalAnalytics'

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'Improving') return <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden />
  if (trend === 'Declining') return <TrendingDown className="h-4 w-4 text-amber-400" aria-hidden />
  return <Minus className="h-4 w-4 text-aurora-text-sec" aria-hidden />
}

export function JournalWeeklyAiInsights({ a }: { a: JournalAnalyticsModel }) {
  if (a.timeView !== '7days') return null
  if (a.weeklyAiLoading) {
    return (
      <div className="card-aurora p-6 animate-pulse">
        <p className="text-sm text-aurora-text-muted italic">Loading weekly insights…</p>
      </div>
    )
  }
  if (!a.weeklyAi) return null

  const ai = a.weeklyAi
  return (
    <div className="rounded-2xl border border-aurora-purple/35 bg-linear-to-br from-[rgba(124,58,237,0.12)] to-[rgba(45,107,255,0.06)] p-6 shadow-[0_0_20px_rgba(124,58,237,0.1)]">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-aurora-purple" aria-hidden />
        <h4 className="text-lg font-bold text-white">Weekly insights</h4>
      </div>
      <p className="mb-4 text-xs text-aurora-text-sec">
        Descriptive patterns from your last 7 days — not a diagnosis or prediction.
      </p>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <TrendIcon trend={ai.trend} />
        <p className="text-sm font-bold text-white">Trend: {ai.trend}</p>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-aurora-text-sec">{ai.summary}</p>

      {ai.observations.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase">
            Observations
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-white">
            {ai.observations.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      )}

      {ai.recommendations.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase">
            Suggestions
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-white">
            {ai.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {ai.support_note ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {ai.support_note}
        </p>
      ) : null}
    </div>
  )
}
