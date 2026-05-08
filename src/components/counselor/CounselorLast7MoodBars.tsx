import { useEffect, useMemo, useState } from 'react'
import { moodService } from '../../services/mood'
import type { MoodLogEntryRow } from '../../services/mood/types'

function startOfLocalDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function toLocalDayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CounselorLast7MoodBars({ studentId }: { studentId: string }) {
  const [logs, setLogs] = useState<MoodLogEntryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      const start = startOfLocalDay(new Date())
      start.setDate(start.getDate() - 6)
      try {
        const data = await moodService.getMoodLogs(studentId, start, end)
        if (!cancelled) setLogs(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setLogs([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [studentId])

  const days = useMemo(() => {
    const today = startOfLocalDay(new Date())
    const out: { key: string; label: string; avgStress: number | null; avgEnergy: number | null }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = toLocalDayKey(d)
      const dayLogs = logs.filter((l) => {
        const t = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
        return toLocalDayKey(t) === key
      })
      const avg = (fn: (x: MoodLogEntryRow) => number) => {
        if (!dayLogs.length) return null
        return dayLogs.reduce((s, x) => s + fn(x), 0) / dayLogs.length
      }
      out.push({
        key,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        avgStress: avg((x) => x.stress),
        avgEnergy: avg((x) => x.energy),
      })
    }
    return out
  }, [logs])

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-6 h-6 border-2 border-aurora-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!days.some((d) => d.avgStress != null || d.avgEnergy != null)) {
    return (
      <div className="card-aurora p-4 text-center bg-aurora-bg/50">
        <p className="text-sm text-aurora-primary-dark/50">No mood entries in the last 7 days.</p>
      </div>
    )
  }

  const bar = (val: number | null, color: string) => {
    if (val == null) {
      return <div className="h-16 flex items-end justify-center"><div className="w-full max-w-[28px] h-1 rounded bg-aurora-primary-dark/10" /></div>
    }
    const h = Math.round((val / 5) * 100)
    return (
      <div className="h-16 flex items-end justify-center">
        <div
          className="w-full max-w-[28px] rounded-t-md transition-all"
          style={{ height: `${Math.max(8, h)}%`, backgroundColor: color }}
          title={`${val.toFixed(1)} / 5`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-aurora-primary-dark">Last 7 days (self-report)</h4>
      <p className="text-xs text-aurora-primary-dark/55 leading-relaxed">
        Averages from the same 1–5 stress and energy scales as the student app. Not a clinical assessment.
      </p>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {days.map((d) => (
          <div key={d.key} className="space-y-1">
            <p className="text-[10px] font-bold text-aurora-primary-dark/45 uppercase">{d.label}</p>
            <div className="grid grid-cols-2 gap-0.5">
              {bar(d.avgStress, '#EF4444')}
              {bar(d.avgEnergy, '#22C55E')}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-4 text-[10px] text-aurora-primary-dark/50">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> Stress</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500" /> Energy</span>
      </div>
    </div>
  )
}