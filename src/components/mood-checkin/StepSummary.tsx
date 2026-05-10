import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { moodService } from '../../services/mood'
import { computeStreak } from '../../utils/analytics'
import {
  getSchoolWorkloadBand,
  getSchoolWorkloadCaption,
} from '../../constants/mood/journalTemplates'
import { QuickResetBreathing } from '../student/QuickResetBreathing'

interface StepSummaryProps {
  schoolTagCount: number
  onCloseModal: () => void
}

export function StepSummary({ schoolTagCount, onCloseModal }: StepSummaryProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const firstName = user?.full_name?.split(' ')[0] || 'Student'

  const [doneStats, setDoneStats] = useState<{ streak: number; todayCheckIns: number } | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    const run = async () => {
      try {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 60)
        const logs = await moodService.getMoodLogs(user.id, start.toISOString(), end.toISOString())
        if (cancelled) return

        const todayKey = (() => {
          const d = new Date()
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        })()

        setDoneStats({
          streak: computeStreak(logs),
          todayCheckIns: logs.filter((l) => l.dayKey === todayKey).length,
        })
      } catch (e) {
        console.error('Failed to load done-step stats:', e)
        if (!cancelled) setDoneStats({ streak: 0, todayCheckIns: 0 })
      }
    }

    run()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Thank-you header */}
      <div className="card-aurora p-6 flex flex-col items-center text-center">
        <div className="w-22 h-22 bg-[rgba(124,58,237,0.15)] rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(124,58,237,0.2)] border border-[rgba(124,58,237,0.3)]">
          <img src="/images/logos/logomark light.png" alt="Aurora" className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 font-heading">
          Thank you for checking in, {firstName}!
        </h2>
        <p className="text-sm text-aurora-text-sec leading-relaxed">
          Keep tracking your mood regularly to better understand your daily patterns.
        </p>
      </div>

      {/* School pressure — only when school tags selected */}
      {schoolTagCount > 0 && (
        <div className="card-aurora p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-widest text-aurora-text-muted uppercase mb-1">
              School pressure today
            </p>
            <p className="text-xs text-aurora-text-sec truncate">
              {getSchoolWorkloadCaption(schoolTagCount)}
            </p>
          </div>
          <span className="shrink-0 text-sm font-extrabold text-aurora-blue ml-3">
            {getSchoolWorkloadBand(schoolTagCount)}
          </span>
        </div>
      )}

      {/* Talk to a Counselor */}
      <div className="card-aurora p-5 border border-aurora-purple/50 shadow-[0_0_15px_rgba(124,58,237,0.1)]">
        <h3 className="text-sm font-bold text-white mb-3">A supportive space for you</h3>
        <button
          onClick={() => { onCloseModal(); navigate('/student/messages') }}
          className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          Talk to a Counselor <MessageSquare className="w-4 h-4 text-aurora-text-sec" />
        </button>
      </div>

      {/* Quick Reset breathing */}
      <QuickResetBreathing />

      {/* Streak + check-in stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-aurora p-4 flex flex-col justify-center">
          <p className="text-[10px] font-extrabold tracking-widest text-aurora-text-muted uppercase mb-1">Streak</p>
          <p className="text-2xl font-bold text-white font-heading tabular-nums">
            {doneStats ? doneStats.streak : '—'}
            <span className="text-sm font-semibold text-aurora-text-sec ml-1">
              {doneStats?.streak === 1 ? 'day' : 'days'}
            </span>
          </p>
        </div>
        <div className="card-aurora p-4 flex flex-col justify-center">
          <p className="text-[10px] font-extrabold tracking-widest text-aurora-text-muted uppercase mb-1">Check-ins today</p>
          <p className="text-2xl font-bold text-white font-heading tabular-nums">
            {doneStats ? doneStats.todayCheckIns : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}