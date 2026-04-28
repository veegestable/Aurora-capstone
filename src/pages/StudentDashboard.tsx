import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MoodCheckIn from '../components/MoodCheckIn'
import { moodService } from '../services/mood'
import { computeStreak, computeTrend, computeDailyInsight } from '../utils/analytics'
import type { TrendDirection } from '../utils/analytics'
import { SessionRequestModal } from '../components/sessions/SessionRequestModal'
import { AnnouncementBanner } from '../components/announcements/AnnouncementBanner'
import {
  MessageSquare, BookOpen, CalendarPlus,
  TrendingUp, TrendingDown, Minus,
  Sparkles, Camera,
} from 'lucide-react'

const trendMeta: Record<TrendDirection, { icon: typeof TrendingUp; label: string; sub: string }> = {
  Improving: { icon: TrendingUp, label: 'Improving', sub: 'Great progress!' },
  Stable:    { icon: Minus,       label: 'Stable',    sub: 'Consistency ✦' },
  Declining: { icon: TrendingDown, label: 'Declining', sub: 'Take it easy' },
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [streak, setStreak] = useState(0)
  const [trend, setTrend] = useState<TrendDirection>('Stable')
  const [insight, setInsight] = useState(
    'Complete a check-in to get a personalized note based on your mood and energy.'
  )
  const [showSessionModal, setShowSessionModal] = useState(false)

  const firstName = user?.full_name?.split(' ')[0] || 'Student'

  const loadStats = async () => {
    if (!user?.id) return
    try {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      const logs = await moodService.getMoodLogs(
        user.id,
        start.toISOString(),
        end.toISOString()
      )
      if (!logs || logs.length === 0) return

      setStreak(computeStreak(logs))
      setTrend(computeTrend(logs))
      setInsight(computeDailyInsight(logs))
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    }
  }

  useEffect(() => {
    loadStats()
  }, [user?.id])

  const TrendIcon = trendMeta[trend].icon

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-[0_0_25px_rgba(45,107,255,0.2)] overflow-hidden ring-2 ring-white/10">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-aurora-blue to-aurora-purple flex items-center justify-center">
                  <span className="text-white text-lg sm:text-xl font-bold">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-aurora-green rounded-full border-2 border-aurora-bg" />
          </div>
          <div>
            <p className="text-sm text-aurora-text-muted tracking-wider uppercase font-body">
              Welcome back
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading">
              {firstName}
            </h2>
          </div>
        </div>
      </div>

      {/* Mood Check-In */}
      <MoodCheckIn onMoodLogged={loadStats} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => setShowSessionModal(true)}
          className="card-aurora flex flex-col items-center justify-center py-5 px-2 hover:shadow-[0_0_20px_rgba(45,107,255,0.1)] transition-all cursor-pointer group"
          aria-label="Request a session"
        >
          <div className="w-11 h-11 rounded-xl bg-linear-to-br from-[rgba(45,107,255,0.25)] to-[rgba(45,107,255,0.1)] flex items-center justify-center mb-2.5 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(45,107,255,0.2)] transition-all">
            <CalendarPlus className="w-5 h-5 text-aurora-blue" />
          </div>
          <span className="text-xs font-semibold text-aurora-text-sec text-center group-hover:text-white transition-colors">
            Request Session
          </span>
        </button>

        <button
          onClick={() => navigate('/student/messages')}
          className="card-aurora flex flex-col items-center justify-center py-5 px-2 hover:shadow-[0_0_20px_rgba(124,58,237,0.1)] transition-all cursor-pointer group"
          aria-label="Open messages"
        >
          <div className="w-11 h-11 rounded-xl bg-linear-to-br from-[rgba(124,58,237,0.25)] to-[rgba(124,58,237,0.1)] flex items-center justify-center mb-2.5 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(124,58,237,0.2)] transition-all">
            <MessageSquare className="w-5 h-5 text-aurora-purple" />
          </div>
          <span className="text-xs font-semibold text-aurora-text-sec text-center group-hover:text-white transition-colors">
            Messages
          </span>
        </button>

        <button
          onClick={() => navigate('/student/resources')}
          className="card-aurora flex flex-col items-center justify-center py-5 px-2 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)] transition-all cursor-pointer group"
          aria-label="Open resources"
        >
          <div className="w-11 h-11 rounded-xl bg-linear-to-br from-[rgba(34,197,94,0.25)] to-[rgba(34,197,94,0.1)] flex items-center justify-center mb-2.5 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all">
            <BookOpen className="w-5 h-5 text-aurora-green" />
          </div>
          <span className="text-xs font-semibold text-aurora-text-sec text-center group-hover:text-white transition-colors">
            Resources
          </span>
        </button>

        <button
          onClick={() => navigate('/student/daily-selfie')}
          className="card-aurora flex flex-col items-center justify-center py-5 px-2 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all cursor-pointer group"
          aria-label="Take Daily Selfie"
        >
          <div className="w-11 h-11 rounded-xl bg-linear-to-br from-[rgba(249,115,22,0.25)] to-[rgba(249,115,22,0.1)] flex items-center justify-center mb-2.5 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-all">
            <Camera className="w-5 h-5 text-aurora-orange" />
          </div>
          <span className="text-xs font-semibold text-aurora-text-sec text-center group-hover:text-white transition-colors">
            Daily Selfie
          </span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="card-aurora relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-aurora-orange to-aurora-amber rounded-r-full" />
          <div className="pl-3">
            <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-2">
              Streak
            </p>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-linear-to-br from-[rgba(249,115,22,0.25)] to-[rgba(249,115,22,0.1)] flex items-center justify-center">
                <span className="text-lg">🔥</span>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white leading-tight">{streak}</p>
                <p className="text-xs text-aurora-text-sec">Days</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card-aurora relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-aurora-blue to-aurora-blue-light rounded-r-full" />
          <div className="pl-3">
            <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-2">
              Trend
            </p>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-linear-to-br from-[rgba(45,107,255,0.25)] to-[rgba(45,107,255,0.1)] flex items-center justify-center">
                <TrendIcon className="w-5 h-5 text-aurora-blue" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-white uppercase leading-tight">
                  {trendMeta[trend].label}
                </p>
                <p className="text-xs text-aurora-text-sec">{trendMeta[trend].sub}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reflective: personal note + community updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Daily Note */}
        <div className="card-aurora relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-r from-[rgba(124,58,237,0.06)] to-transparent pointer-events-none" />
          <div className="relative flex items-start space-x-4">
            <div className="w-11 h-11 rounded-full bg-linear-to-br from-[rgba(124,58,237,0.3)] to-[rgba(124,58,237,0.1)] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(124,58,237,0.15)]">
              <Sparkles className="w-5 h-5 text-aurora-purple" />
            </div>
            <div>
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                Daily Note
                {streak > 0 && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-aurora-purple bg-[rgba(124,58,237,0.15)] px-2 py-0.5 rounded-full">
                    Updated
                  </span>
                )}
              </h3>
              <p className="text-sm text-aurora-text-sec leading-relaxed">{insight}</p>
            </div>
          </div>
        </div>

        {/* Announcements */}
        <AnnouncementBanner role="student" />
      </div>

      {/* Session Request Modal */}
      <SessionRequestModal
        visible={showSessionModal}
        studentId={user?.id ?? ''}
        studentName={user?.full_name}
        studentAvatar={user?.avatar_url ?? undefined}
        onClose={() => setShowSessionModal(false)}
        onSuccess={() => setShowSessionModal(false)}
      />
    </div>
  )
}