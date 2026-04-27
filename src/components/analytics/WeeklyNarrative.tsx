import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { moodService } from '../../services/mood'
import { analyticsService } from '../../services/analytics'
import type { WeeklySummaryResult, MoodLogEntry } from '../../services/analytics/helpers'
import { Sparkles, RefreshCw, MessageCircle } from 'lucide-react'

export function WeeklyNarrative() {
  const { user } = useAuth()
  const [result, setResult] = useState<WeeklySummaryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (forceRefresh = false) => {
    if (!user?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 21)
      const logs = await moodService.getMoodLogs(
        user.id,
        start.toISOString(),
        end.toISOString()
      )
      const normalized: MoodLogEntry[] = (logs as any[]).map((l) => ({
        log_date: l.log_date instanceof Date ? l.log_date : new Date(l.log_date),
        energy_level: l.energy_level ?? 5,
        stress_level: l.stress_level ?? 3,
        dominant_emotion: l.dominant_emotion,
      }))
      const narrative = await analyticsService.fetchWeeklyNarrative(
        user.id,
        normalized,
        forceRefresh
      )
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
          onClick={() => load(true)}
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

  return (
    <div className="bg-[#10143C] rounded-xl p-4 md:p-6 border border-white/8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#7C3AED]" />
          Weekly Summary
          {result.source === 'fallback' && (
            <span className="text-[10px] font-bold text-[#7B8EC8] bg-white/5 px-2 py-0.5 rounded-full">
              OFFLINE
            </span>
          )}
        </h4>
        <button
          onClick={() => load(true)}
          disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Refresh weekly summary"
        >
          <RefreshCw className={`w-4 h-4 text-[#7B8EC8] ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary */}
      <div className="flex items-start gap-3 bg-[rgba(124,58,237,0.1)] p-4 rounded-xl border border-[rgba(124,58,237,0.2)]">
        <div className="p-2 rounded-lg bg-[rgba(124,58,237,0.2)] shrink-0">
          <MessageCircle className="w-5 h-5 text-aurora-purple-bright" />
        </div>
        <div>
          <p className="text-sm text-aurora-text-sec leading-relaxed">{result.summary}</p>
        </div>
      </div>
    </div>
  )
}