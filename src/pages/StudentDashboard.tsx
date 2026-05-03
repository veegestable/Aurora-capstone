import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MoodCheckIn from '../components/MoodCheckIn'
import { moodService } from '../services/mood'
import { computeStreak, computeStability, computeDailyInsight } from '../utils/analytics'
import type { StabilityMetrics } from '../utils/analytics'
import { SessionRequestModal } from '../components/sessions/SessionRequestModal'
import { AnnouncementBanner } from '../components/announcements/AnnouncementBanner'
import {
  MessageSquare, BookOpen, CalendarPlus,
  Sparkles, ShieldCheck
} from 'lucide-react'

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [streak, setStreak] = useState(0)
  const [stability, setStability] = useState<StabilityMetrics>({ percentage: 100, label: 'Stable' })
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
      setStability(computeStability(logs))
      setInsight(computeDailyInsight(logs))
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    }
  }

  useEffect(() => {
    loadStats()
  }, [user?.id])

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl shadow-[0_0_25px_rgba(45,107,255,0.2)] overflow-hidden ring-2 ring-white/10">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-aurora-blue to-aurora-purple flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-aurora-green rounded-full border-2 border-aurora-bg" />
        </div>
        <div>
          <p className="text-xs font-bold text-aurora-text-muted tracking-widest uppercase mb-1">
            Welcome back
          </p>
          <h2 className="text-3xl font-bold text-white font-heading tracking-wide">
            {firstName}
          </h2>
        </div>
      </div>

      {/* Mood Check-In Widget */}
      <MoodCheckIn onMoodLogged={loadStats} />

      {/* Quick Actions (3 Cards) */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setShowSessionModal(true)}
          className="card-aurora flex flex-col items-center justify-center py-5 px-2 hover:shadow-[0_0_20px_rgba(45,107,255,0.1)] transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-[rgba(45,107,255,0.15)] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[rgba(45,107,255,0.25)] transition-all">
            <CalendarPlus className="w-5 h-5 text-aurora-blue" />
          </div>
          <span className="text-xs font-semibold text-aurora-text-sec text-center group-hover:text-white transition-colors">
            Request Session
          </span>
        </button>

        <button
          onClick={() => navigate('/student/messages')}
          className="card-aurora flex flex-col items-center justify-center py-5 px-2 hover:shadow-[0_0_20px_rgba(124,58,237,0.1)] transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-[rgba(124,58,237,0.15)] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[rgba(124,58,237,0.25)] transition-all">
            <MessageSquare className="w-5 h-5 text-aurora-purple" />
          </div>
          <span className="text-xs font-semibold text-aurora-text-sec text-center group-hover:text-white transition-colors">
            Messages
          </span>
        </button>

        <button
          onClick={() => navigate('/student/resources')}
          className="card-aurora flex flex-col items-center justify-center py-5 px-2 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)] transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.15)] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[rgba(34,197,94,0.25)] transition-all">
            <BookOpen className="w-5 h-5 text-aurora-green" />
          </div>
          <span className="text-xs font-semibold text-aurora-text-sec text-center group-hover:text-white transition-colors">
            Resources
          </span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Streak Card */}
        <div className="card-aurora relative overflow-hidden flex items-center p-5">
          <div className="absolute top-0 left-0 w-1 h-full bg-aurora-orange rounded-r-full" />
          <div className="w-12 h-12 rounded-full bg-[rgba(249,115,22,0.15)] flex items-center justify-center text-2xl mr-4 shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
            🔥
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-1">
              Current Streak
            </p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-extrabold text-white font-heading">{streak}</p>
              <span className="text-sm font-semibold text-aurora-text-sec">days</span>
            </div>
          </div>
        </div>

        {/* Stability Card */}
        <div className="card-aurora relative overflow-hidden flex items-center p-5">
          <div className="absolute top-0 left-0 w-1 h-full bg-aurora-blue rounded-r-full" />
          <div className="w-12 h-12 rounded-full bg-[rgba(45,107,255,0.15)] flex items-center justify-center text-2xl mr-4 shrink-0 shadow-[0_0_15px_rgba(45,107,255,0.1)]">
            <ShieldCheck className="w-6 h-6 text-aurora-blue" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-1">
              Today's Stability
            </p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-extrabold text-white font-heading">{stability.percentage}%</p>
            </div>
            <p className="text-xs font-medium text-aurora-text-sec truncate">{stability.label}</p>
          </div>
        </div>
      </div>

      {/* Reflective: Daily Note + Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Note */}
        <div className="card-aurora relative overflow-hidden p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-aurora-purple/5 rounded-full blur-3xl" />
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[rgba(124,58,237,0.15)] flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.1)]">
                <Sparkles className="w-5 h-5 text-aurora-purple" />
              </div>
              <h3 className="font-bold text-white tracking-wide">Daily note</h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-aurora-purple bg-[rgba(124,58,237,0.15)] px-3 py-1 rounded-full">
              Updated
            </span>
          </div>
          
          <p className="text-sm font-medium text-aurora-text-sec leading-relaxed relative z-10">
            {insight}
          </p>
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