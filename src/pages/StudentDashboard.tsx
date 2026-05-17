import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MoodCheckIn from '../components/mood-checkin'
import { moodService } from '../services/mood'
import { computeStreak, computeStability, computeDailyInsight, type StabilityMetrics } from '../utils/analytics'
import { DashboardSessionRequestModal } from '../components/sessions/DashboardSessionRequestModal'
import { AnnouncementBanner } from '../components/announcements/AnnouncementBanner'
import { StudentSessionsPane } from '../components/student/StudentSessionsPane'
import {
  MessageSquare, BookOpen, CalendarPlus,
  Sparkles, ShieldCheck, CalendarClock, CircleHelp, X,
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
  const [showSessionsPane, setShowSessionsPane] = useState(false)
  const [showStabilityHint, setShowStabilityHint] = useState(false)

  const firstName = user?.full_name?.split(' ')[0] || 'Student'

  const loadStats = async () => {
    if (!user?.id) return
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 45)
      const logs = await moodService.getMoodLogs(
        user.id,
        startDate.toISOString(),
        endDate.toISOString(),
      )
      if (!logs || logs.length === 0) return

      const todayStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
      const todayLogs = logs.filter((l) => {
        const t = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)
        const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
        return key === todayStr
      })

      setStreak(computeStreak(logs))
      setStability(computeStability(todayLogs))
      setInsight(computeDailyInsight(logs))
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    }
  }

  useEffect(() => {
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative shrink-0">
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
          <div className="min-w-0">
            <p className="text-xs font-bold text-aurora-text-muted tracking-widest uppercase mb-1">
              Welcome back
            </p>
            <h2 className="text-3xl font-bold text-white font-heading tracking-wide truncate">
              {firstName}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSessionsPane(true)}
          aria-label="Open My Sessions"
          className="shrink-0 w-12 h-12 rounded-2xl bg-[rgba(45,107,255,0.12)] border border-[rgba(45,107,255,0.3)] flex items-center justify-center hover:bg-[rgba(45,107,255,0.2)] hover:border-[rgba(45,107,255,0.5)] transition-colors cursor-pointer"
        >
          <CalendarClock className="w-5 h-5 text-aurora-blue" />
        </button>
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
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase">
                Today's Stability
              </p>
              <button
                type="button"
                onClick={() => setShowStabilityHint(true)}
                aria-label="What is Today's Stability?"
                className="p-0.5 -mt-px rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <CircleHelp className="w-3.5 h-3.5 text-aurora-text-muted" />
              </button>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
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
      <DashboardSessionRequestModal
        visible={showSessionModal}
        studentId={user?.id ?? ''}
        onClose={() => setShowSessionModal(false)}
        onSuccess={({ counselorId }) => {
          setShowSessionModal(false)
          navigate(
            `/student/messages?counselorId=${encodeURIComponent(counselorId)}&openSessionRequest=1`,
            { state: { counselorId, openSessionRequest: true } },
          )
        }}
      />

      {/* My Sessions Pane (welcome-row CalendarClock icon) */}
      <StudentSessionsPane
        visible={showSessionsPane}
        studentId={user?.id ?? ''}
        onClose={() => setShowSessionsPane(false)}
      />

      {/* Today's Stability — explainer modal */}
      {showStabilityHint && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stability-hint-title"
          onClick={() => setShowStabilityHint(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f0f11] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-6 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[rgba(45,107,255,0.15)] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-aurora-blue" />
                </div>
                <h3 id="stability-hint-title" className="text-base font-bold text-white">
                  What is Today's Stability?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStabilityHint(false)}
                aria-label="Dismiss"
                className="p-1.5 -m-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-aurora-text-sec" />
              </button>
            </div>
            <p className="text-sm text-aurora-text-sec leading-relaxed mb-3">
              Stability is a quick read of how steady your mood has been throughout today.
              We look at the variance between your check-ins logged today to gauge emotional consistency.
            </p>
            <ul className="text-sm text-aurora-text-sec space-y-1.5 mb-4 pl-1">
              <li><span className="text-white font-semibold">90–100%</span> · Very steady</li>
              <li><span className="text-white font-semibold">70–89%</span> · Mostly steady</li>
              <li><span className="text-white font-semibold">50–69%</span> · Some variation</li>
              <li><span className="text-white font-semibold">Below 50%</span> · A turbulent stretch — be gentle with yourself</li>
            </ul>
            <p className="text-xs text-aurora-text-muted leading-relaxed">
              This is a self-report summary, not a clinical assessment. It only changes after you log a check-in.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}