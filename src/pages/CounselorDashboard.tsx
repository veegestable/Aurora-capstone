import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { counselorService } from '../services/counselor'
import { counselorCheckInContextService } from '../services/counselor-checkin-context'
import { sessionsService } from '../services/sessions'
import { messagesService } from '../services/messages'
import { SessionCard } from '../components/sessions/SessionCard'
import type { Session } from '../types/session.types'
import {
  Users, AlertTriangle, MessageSquare,
  Calendar, ChevronRight,
} from 'lucide-react'
import type { CounselorSignalPill } from '../constants/counselor/counselor-checkin-signals'
import { COUNSELOR_SIGNAL_LABEL, COUNSELOR_SIGNAL_SORT, counselorSignalFromLogs } from '../constants/counselor/counselor-checkin-signals'
import { formatTimeAgo } from '../utils/riskHelpers'
import { LetterAvatar } from '../components/LetterAvatar'

interface FlagItem {
  id: string
  name: string
  program: string
  time: string
  signal: CounselorSignalPill
}

interface StatCardProps {
  icon: React.ReactNode
  count: string | number
  label: string
  accent?: string
}

function StatCard({ icon, count, label, accent }: StatCardProps) {
  return (
    <div className={`card-aurora flex flex-col gap-2 p-5 min-h-[120px] ${accent ?? ''}`}>
      {icon}
      <span className="text-3xl font-extrabold text-aurora-primary-dark tracking-tight">
        {count}
      </span>
      <span className="text-xs text-aurora-primary-dark/60">{label}</span>
    </div>
  )
}

function getSignalStyle(signal: CounselorSignalPill) {
  switch (signal) {
    case 'higher_self_report':
      return { border: 'border-l-red-500', badgeBg: 'bg-red-500/10', badgeBorder: 'border-red-500/25', text: 'text-red-500' }
    case 'moderate_self_report':
      return { border: 'border-l-orange-500', badgeBg: 'bg-orange-500/10', badgeBorder: 'border-orange-500/25', text: 'text-orange-500' }
    case 'typical_self_report':
      return { border: 'border-l-blue-500', badgeBg: 'bg-blue-500/10', badgeBorder: 'border-blue-500/25', text: 'text-blue-500' }
    case 'no_checkins':
      return { border: 'border-l-amber-400', badgeBg: 'bg-amber-400/10', badgeBorder: 'border-amber-400/25', text: 'text-amber-400' }
    case 'sharing_off':
      return { border: 'border-l-gray-400', badgeBg: 'bg-gray-400/10', badgeBorder: 'border-gray-400/25', text: 'text-gray-400' }
  }
}

function FlagRow({ item }: { item: FlagItem }) {
  const style = getSignalStyle(item.signal)
  return (
    <Link
      to="/counselor/students"
      className={`flex items-center card-aurora border-l-4 ${style.border} p-0 overflow-hidden hover:shadow-lg transition-shadow`}
      aria-label={`View check-in details for ${item.name}`}
    >
      <div className="p-3 pl-4">
        <LetterAvatar name={item.name} size={44} />
      </div>
      <div className="flex-1 py-3">
        <p className="font-bold text-aurora-primary-dark text-sm">{item.name}</p>
        <p className="text-xs text-aurora-primary-dark/50 mt-0.5">
          {item.program} · {item.time}
        </p>
      </div>
      <div className="pr-2">
        <span
          className={`inline-block text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-full border ${style.badgeBg} ${style.badgeBorder} ${style.text}`}
        >
          {COUNSELOR_SIGNAL_LABEL[item.signal]}
        </span>
      </div>
      <ChevronRight className="w-4 h-4 text-aurora-primary-dark/30 mr-3 shrink-0" />
    </Link>
  )
}

export default function CounselorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [studentCount, setStudentCount] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [recentFlags, setRecentFlags] = useState<FlagItem[]>([])
  const [pendingSessions, setPendingSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const firstName = user?.full_name?.split(' ')[0] || 'Counselor'

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const students = await counselorService.getStudents()
        if (cancelled) return
        setStudentCount(students.length)

        const fetchLimit = Math.min(15, students.length)
        const studentsWithContext = await Promise.all(
          students.slice(0, fetchLimit).map(async (s) => {
            try {
              const { sharingEnabled, logs } = await counselorCheckInContextService.fetchStudentCheckInContext(s.id)
              const latestLog = logs[0]
              return { student: s, sharingEnabled, logs, lastLogDate: latestLog?.log_date }
            } catch {
              return { student: s, sharingEnabled: false, logs: [] as Array<{ stress_level?: number; energy_level?: number }>, lastLogDate: undefined as Date | undefined }
            }
          })
        )

        if (cancelled) return

        const flags: FlagItem[] = studentsWithContext
          .map(({ student, sharingEnabled, logs, lastLogDate }) => ({
            id: student.id,
            name: student.full_name || 'Student',
            program: student.email,
            time: !sharingEnabled ? 'Sharing off' : (lastLogDate ? formatTimeAgo(new Date(lastLogDate)) : 'No check-ins yet'),
            signal: counselorSignalFromLogs(sharingEnabled, logs),
          }))
          .sort((a, b) => COUNSELOR_SIGNAL_SORT[a.signal] - COUNSELOR_SIGNAL_SORT[b.signal])

        setRecentFlags(flags)

        if (user?.id) {
          const [sessions, convos] = await Promise.all([
            sessionsService.getSessionsForCounselor(user.id),
            messagesService.getConversationsForCounselor(user.id),
          ])
          if (!cancelled) {
            setPendingSessions(sessions.filter((s) => s.status === 'requested' || s.status === 'pending'))
            setUnreadMessages(convos.filter((c) => c.isUnread).length)
          }
        }
      } catch (error) {
        console.error('Error fetching counselor dashboard data:', error)
        if (!cancelled) {
          setRecentFlags([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-primary-dark/40 uppercase">
          Counselor Portal
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading mt-1">
          Hello, {firstName}
        </h2>
      </div>

      {/* Stat Cards */}
      <div>
        <h3 className="text-lg font-extrabold text-aurora-primary-dark mb-3 font-heading">
          Dashboard Overview
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={
              <div className="w-9 h-9 rounded-full bg-aurora-secondary-blue/15 flex items-center justify-center">
                <Users className="w-[18px] h-[18px] text-aurora-secondary-blue" />
              </div>
            }
            count={studentCount}
            label="Total Students"
          />
          <StatCard
            icon={
              <div className="relative w-9 h-9 rounded-full bg-aurora-secondary-blue/10 flex items-center justify-center">
                <MessageSquare className="w-[18px] h-[18px] text-aurora-secondary-blue" />
                {unreadMessages > 0 && (
                  <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-aurora-secondary-blue" />
                )}
              </div>
            }
            count={unreadMessages}
            label="Unread Messages"
          />
          <StatCard
            icon={
              <div className="w-9 h-9 rounded-full bg-amber-400/10 flex items-center justify-center">
                <Calendar className="w-[18px] h-[18px] text-amber-500" />
              </div>
            }
            count={pendingSessions.length}
            label="Session Requests"
          />
        </div>
      </div>

      {/* Recent Flags */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold text-aurora-primary-dark font-heading">
            Recent check-ins
          </h3>
          <Link
            to="/counselor/students"
            className="flex items-center gap-1 text-aurora-secondary-blue text-xs font-bold hover:underline"
          >
            VIEW ALL
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-secondary-blue" />
            <span className="ml-3 text-aurora-primary-dark/50 text-sm">Loading...</span>
          </div>
        ) : recentFlags.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-aurora-primary-dark/20 mx-auto mb-3" />
            <p className="text-aurora-primary-dark/50 text-sm">No student flags to display.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentFlags.map((item) => (
              <FlagRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Pending Session Requests */}
      {pendingSessions.length > 0 && (
        <div>
          <h3 className="text-lg font-extrabold text-aurora-primary-dark mb-3 font-heading">
            Session Requests
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingSessions.slice(0, 4).map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onAction={() => navigate('/counselor/messages')}
                actionLabel="View in Messages"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}