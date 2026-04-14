import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MoodCheckIn from '../components/MoodCheckIn'
import {
  MessageSquare,
  BookOpen,
  CalendarPlus,
  TrendingUp,
  Sparkles,
} from 'lucide-react'

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const firstName = user?.full_name?.split(' ')[0] || 'Student'

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
      <MoodCheckIn
        onMoodLogged={() => console.log('Mood check-in completed')}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={() => {/* TODO: open session request modal */}}
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
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Streak Card */}
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
                <p className="text-2xl font-extrabold text-white leading-tight">
                  7
                </p>
                <p className="text-xs text-aurora-text-sec">Days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trend Card */}
        <div className="card-aurora relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-aurora-blue to-aurora-blue-light rounded-r-full" />
          <div className="pl-3">
            <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-2">
              Trend
            </p>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-linear-to-br from-[rgba(45,107,255,0.25)] to-[rgba(45,107,255,0.1)] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-aurora-blue" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-white uppercase leading-tight">
                  Stable
                </p>
                <p className="text-xs text-aurora-text-sec">Consistency ✦</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insight Card */}
      <div className="card-aurora relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-[rgba(124,58,237,0.06)] to-transparent pointer-events-none" />
        <div className="relative flex items-start space-x-4">
          <div className="w-11 h-11 rounded-full bg-linear-to-br from-[rgba(124,58,237,0.3)] to-[rgba(124,58,237,0.1)] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(124,58,237,0.15)]">
            <Sparkles className="w-5 h-5 text-aurora-purple" />
          </div>
          <div>
            <h3 className="font-bold text-white mb-1 flex items-center gap-2">
              AI Insight
              <span className="text-[10px] font-semibold uppercase tracking-wider text-aurora-purple bg-[rgba(124,58,237,0.15)] px-2 py-0.5 rounded-full">New</span>
            </h3>
            <p className="text-sm text-aurora-text-sec leading-relaxed">
              Your mood has been consistent this week. Keep up the daily check-ins
              to build a clearer emotional picture.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}