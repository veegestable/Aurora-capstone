import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { sessionsService } from '../../services/sessions'
import { counselorService } from '../../services/counselor'
import { SessionCard } from '../../components/sessions/SessionCard'
import { SessionHistoryDetailModal } from '../../components/counselor/SessionHistoryDetailModal'
import type { Session, SessionStatus } from '../../types/session.types'
import type { StudentInfo } from '../../services/counselor'
import { Search, Loader2 } from 'lucide-react'

type FilterValue = SessionStatus | 'all'

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All',         value: 'all' },
  { label: 'Pending',     value: 'pending' },
  { label: 'Confirmed',   value: 'confirmed' },
  { label: 'Reschedule',  value: 'needs_rescheduling' },
  { label: 'Completed',   value: 'completed' },
  { label: 'Expired',     value: 'expired' },
  { label: 'Cancelled',   value: 'cancelled' },
  { label: 'Missed',      value: 'missed' },
]

interface LocationStateShape {
  /** Either a SessionStatus or one of the bucket keys used by `CounselorSessionsPane`. */
  statusFilter?: FilterValue | 'upcoming' | 'reschedule' | 'closed'
  openSessionId?: string
}

/** Map bucket keys (from CounselorSessionsPane) to the matching FilterValue. */
function resolveIncomingFilter(raw: LocationStateShape['statusFilter']): FilterValue {
  if (!raw) return 'all'
  if (raw === 'upcoming') return 'confirmed'
  if (raw === 'reschedule') return 'needs_rescheduling'
  if (raw === 'closed') return 'cancelled' // 'closed' bucket can be cancelled OR missed; default chip = Cancelled
  return raw as FilterValue
}

export default function SessionHistory() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const incoming = (location.state as LocationStateShape | null) ?? null

  const [sessions, setSessions] = useState<Session[]>([])
  const [studentsMap, setStudentsMap] = useState<Record<string, StudentInfo>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterValue>(
    () => resolveIncomingFilter(incoming?.statusFilter),
  )
  const [openSession, setOpenSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const loadData = async () => {
      try {
        const [fetchedSessions, fetchedStudents] = await Promise.all([
          sessionsService.getSessionsForCounselor(user.id),
          counselorService.getStudents(),
        ])
        if (cancelled) return
        setSessions(fetchedSessions)
        const map: Record<string, StudentInfo> = {}
        fetchedStudents.forEach((s) => {
          map[s.id] = s as typeof map[string]
        })
        setStudentsMap(map)
      } catch (error) {
        console.error('Failed to load session history:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [user])

  // Auto-open a specific session when arriving with `openSessionId` in route state.
  useEffect(() => {
    if (loading || !incoming?.openSessionId) return
    const target = sessions.find((s) => s.id === incoming.openSessionId)
    if (target) {
      setOpenSession(target)
      // Clear the consumed state so a refresh doesn't re-open the modal.
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [loading, incoming?.openSessionId, sessions, navigate, location.pathname])

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const studentName = studentsMap[session.studentId]?.full_name || 'Unknown Student'
      const matchesSearch = studentName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || session.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [sessions, studentsMap, searchQuery, statusFilter])

  const handleSessionUpdated = (sessionId: string, newStatus: SessionStatus) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s)),
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-aurora-blue animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-white">Session History</h1>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-aurora-text-muted" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name..."
            className="w-full bg-aurora-card border border-aurora-border rounded-[14px] py-3.5 pl-12 pr-4 text-white placeholder-aurora-text-muted focus:outline-none focus:border-aurora-blue/50"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {FILTERS.map((filter) => {
            const isActive = statusFilter === filter.value
            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-[12px] text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-aurora-blue/15 text-aurora-blue border border-aurora-blue/40'
                    : 'bg-aurora-card border border-aurora-border text-aurora-text-sec hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="card-aurora flex flex-col items-center justify-center py-16">
          <p className="text-aurora-text-sec font-semibold">No sessions found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => setOpenSession(session)}
              className="text-left cursor-pointer hover:scale-[1.01] transition-transform"
            >
              <SessionCard
                session={session}
                peerName={studentsMap[session.studentId]?.full_name || 'Unknown Student'}
              />
            </button>
          ))}
        </div>
      )}

      <SessionHistoryDetailModal
        open={!!openSession}
        session={openSession}
        student={openSession ? studentsMap[openSession.studentId] ?? null : null}
        onClose={() => setOpenSession(null)}
        onUpdated={(newStatus) => {
          if (openSession) handleSessionUpdated(openSession.id, newStatus)
        }}
      />
    </div>
  )
}