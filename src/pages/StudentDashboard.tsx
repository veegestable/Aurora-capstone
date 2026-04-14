import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MoodCheckIn from '../components/MoodCheckIn'
import {
  MessageSquare,
  BookOpen,
  CalendarPlus,
  TrendingUp,
  Lightbulb,
} from 'lucide-react'

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const firstName = user?.full_name?.split(' ')[0] || 'Student'

  return (
    <div
      className="space-y-6"
    >
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-aurora-gray-500 tracking-wider uppercase font-body">
            Welcome back
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-aurora-primary-dark font-heading">
            {firstName}
          </h2>
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
          className="card-aurora flex flex-col items-center justify-center py-4 px-2 hover:shadow-aurora-lg transition-all cursor-pointer group"
          aria-label="Request a session"
        >
          <div className="w-10 h-10 rounded-xl bg-aurora-secondary-blue/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <CalendarPlus className="w-5 h-5 text-aurora-secondary-blue" />
          </div>
          <span className="text-xs font-semibold text-aurora-gray-600 text-center">
            Request Session
          </span>
        </button>

        <button
          onClick={() => navigate('/student/messages')}
          className="card-aurora flex flex-col items-center justify-center py-4 px-2 hover:shadow-aurora-lg transition-all cursor-pointer group"
          aria-label="Open messages"
        >
          <div className="w-10 h-10 rounded-xl bg-aurora-accent-purple/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-5 h-5 text-aurora-accent-purple" />
          </div>
          <span className="text-xs font-semibold text-aurora-gray-600 text-center">
            Messages
          </span>
        </button>

        <button
          onClick={() => navigate('/student/resources')}
          className="card-aurora flex flex-col items-center justify-center py-4 px-2 hover:shadow-aurora-lg transition-all cursor-pointer group"
          aria-label="Open resources"
        >
          <div className="w-10 h-10 rounded-xl bg-aurora-accent-green/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <BookOpen className="w-5 h-5 text-aurora-accent-green" />
          </div>
          <span className="text-xs font-semibold text-aurora-gray-600 text-center">
            Resources
          </span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Streak Card */}
        <div className="card-aurora">
          <p className="text-[10px] font-bold tracking-widest text-aurora-gray-400 uppercase mb-2">
            Streak
          </p>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-aurora-accent-orange/20 flex items-center justify-center">
              <span className="text-lg">🔥</span>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-aurora-primary-dark leading-tight">
                7
              </p>
              <p className="text-xs text-aurora-gray-500">Days</p>
            </div>
          </div>
        </div>

        {/* Trend Card */}
        <div className="card-aurora">
          <p className="text-[10px] font-bold tracking-widest text-aurora-gray-400 uppercase mb-2">
            Trend
          </p>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-aurora-secondary-blue/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-aurora-secondary-blue" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-aurora-primary-dark uppercase leading-tight">
                Stable
              </p>
              <p className="text-xs text-aurora-gray-500">Consistency ✦</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insight Card */}
      <div className="card-aurora flex items-start space-x-4">
        <div className="w-11 h-11 rounded-full bg-aurora-accent-purple/20 flex items-center justify-center shrink-0">
          <Lightbulb className="w-5 h-5 text-aurora-accent-purple" />
        </div>
        <div>
          <h3 className="font-bold text-aurora-primary-dark mb-1">AI Insight</h3>
          <p className="text-sm text-aurora-gray-500 leading-relaxed">
            Your mood has been consistent this week. Keep up the daily check-ins
            to build a clearer emotional picture.
          </p>
        </div>
      </div>
    </div>
  )
}