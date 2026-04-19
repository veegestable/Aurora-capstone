import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { moodService } from '../../services/mood'
import { analyticsService } from '../../services/analytics'
import type { WeeklyAiResult, MoodLogEntry } from '../../services/analytics/helpers'
import {
  Sparkles, TrendingUp, Minus, TrendingDown,
  Lightbulb, Heart, RefreshCw
} from 'lucide-react'

const TREND_CONFIG = {
  Improving: { icon: TrendingUp,   color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/15' },
  Stable:    { icon: Minus,        color: 'text-[#2D6BFF]', bg: 'bg-[#2D6BFF]/15' },
  Declining: { icon: TrendingDown, color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/15' },
} as const

export function WeeklyNarrative() {
  const { user } = useAuth()
  const [result, setResult] = useState<WeeklyAiResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!user?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 21) // fetch 3 weeks to cover the 7-day window
      const logs = await moodService.getMoodLogs(
        user.id,
        start.toISOString(),
        end.toISOString()
      )
      const normalized: MoodLogEntry[] = (
        logs as Array<{ log_date: Date; energy_level: number; stress_level: number }>
      ).map((l) => ({
        log_date: l.log_date instanceof Date ? l.log_date : new Date(l.log_date),
        energy_level: l.energy_level ?? 5,
        stress_level: l.stress_level ?? 3,
      }))
      const narrative = await analyticsService.fetchWeeklyNarrative(normalized)
      setResult(narrative)
    } catch (err) {
      console.error('[WeeklyNarrative] load failed:', err)
      setError('Could not generate your weekly summary.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user?.id])

  if (error) {
    return (
      <div className="bg-[#10143C] rounded-xl p-4 md:p-6 border border-white/8">
        <h4 className="text-lg font-semibold text-white mb-2">Weekly Summary</h4>
        <p className="text-[#EF4444] text-sm">{error}</p>
        <button
          onClick={load}
          className="mt-3 text-sm text-[#2D6BFF] hover:underline cursor-pointer"
        >
          Try again
        </button>
      </div>
    )
  }

  if (isLoading || !result) {
    return (
      <div className="bg-[#10143C] rounded-xl p-4 md:p-6 border border-white/8">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#7C3AED]" />
          Weekly Summary
        </h4>
        <div className="flex items-center gap-3 py-6 justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2D6BFF]" />
          <span className="text-[#7B8EC8] text-sm">Generating your weekly summary…</span>
        </div>
      </div>
    )
  }

  const trendCfg = TREND_CONFIG[result.trend]
  const TrendIcon = trendCfg.icon

  return (
    <div className="bg-[#10143C] rounded-xl p-4 md:p-6 border border-white/8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#7C3AED]" />
          Weekly Summary
          {!result.fromAi && (
            <span className="text-[10px] font-bold text-[#7B8EC8] bg-white/5 px-2 py-0.5 rounded-full">
              OFFLINE
            </span>
          )}
        </h4>
        <button
          onClick={load}
          disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Refresh weekly summary"
        >
          <RefreshCw className={`w-4 h-4 text-[#7B8EC8] ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Trend badge + summary */}
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${trendCfg.bg} shrink-0`}>
          <TrendIcon className={`w-5 h-5 ${trendCfg.color}`} />
        </div>
        <div>
          <span className={`text-sm font-bold ${trendCfg.color}`}>{result.trend}</span>
          <p className="text-sm text-[#7B8EC8] mt-1 leading-relaxed">{result.summary}</p>
        </div>
      </div>

      {/* Observations */}
      {result.observations.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-white/60 uppercase tracking-wider">
            Observations
          </h5>
          <ul className="space-y-1.5">
            {result.observations.map((obs, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#7B8EC8]">
                <span className="text-[#2D6BFF] mt-1 shrink-0">•</span>
                {obs}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-[#FEBD03]" />
            Suggestions
          </h5>
          <ul className="space-y-1.5">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#7B8EC8]">
                <span className="text-[#FEBD03] mt-1 shrink-0">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Support note */}
      {result.support_note && (
        <div className="flex items-start gap-2 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-lg px-3 py-2.5">
          <Heart className="w-4 h-4 text-[#7C3AED] mt-0.5 shrink-0" />
          <p className="text-xs text-[#7B8EC8] leading-relaxed">{result.support_note}</p>
        </div>
      )}
    </div>
  )
}