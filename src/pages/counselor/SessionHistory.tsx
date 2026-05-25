import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { sessionsService } from '../../services/sessions'
import { counselorService } from '../../services/counselor'
import { SessionHistoryDetailModal } from '../../components/counselor/SessionHistoryDetailModal'
import { SessionHistoryTimelineCard } from '../../components/counselor/SessionHistoryTimelineCard'
import {
  SessionAttendanceModal,
  type AttendanceStatus,
} from '../../components/counselor/SessionAttendanceModal'
import { SendSessionInviteModal } from '../../components/counselor/SendSessionInviteModal'
import type { Session, SessionStatus } from '../../types/session.types'
import type { StudentInfo } from '../../services/counselor'
import { Search, Loader2 } from 'lucide-react'
import {
  computeSessionHistoryBadge,
  getConfirmedFinalSlot,
  sessionQualifiesForCounselorHistoryList,
  resolveSessionHistoryListFilter,
  SESSION_HISTORY_LIST_FILTERS,
  sessionMatchesSessionHistoryListFilter,
  type SessionHistoryListFilter,
} from '../../utils/sessionScheduling'
import {
  formatDateHeader,
  formatSlotForDisplay,
  groupSessionsByTimelineDate,
} from '../../utils/sessionHistoryDisplay'

interface LocationStateShape {
  statusFilter?: SessionHistoryListFilter | SessionStatus | 'upcoming' | 'reschedule' | 'closed'
  openSessionId?: string
}

function mapAttendanceToOutcome(
  status: AttendanceStatus,
): 'completed' | 'missed' | 'rescheduled' {
  if (status === 'showed_up') return 'completed'
  if (status === 'did_not_show') return 'missed'
  return 'rescheduled'
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
  const [statusFilter, setStatusFilter] = useState<SessionHistoryListFilter>(() =>
    resolveSessionHistoryListFilter(incoming?.statusFilter),
  )
  const [openSession, setOpenSession] = useState<Session | null>(null)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [attendanceBusy, setAttendanceBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const loadData = async () => {
      try {
        const [fetchedSessions, fetchedStudents] = await Promise.all([
          sessionsService.getSessionsForCounselor(user.id),
          counselorService.getStudentsForCounselor(user.id, {
            activeCollegeCode: user.college_code,
          }),
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
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (loading || !incoming?.openSessionId) return
    const target = sessions.find((s) => s.id === incoming.openSessionId)
    if (target) {
      setOpenSession(target)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [loading, incoming?.openSessionId, sessions, navigate, location.pathname])

  const filteredSessions = useMemo(() => {
    let list = sessions.filter((s) => sessionQualifiesForCounselorHistoryList(s))

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((session) => {
        const studentName = studentsMap[session.studentId]?.full_name || 'Unknown Student'
        return studentName.toLowerCase().includes(q) || session.studentId.toLowerCase().includes(q)
      })
    }

    if (statusFilter !== 'all') {
      list = list.filter((session) =>
        sessionMatchesSessionHistoryListFilter(session, statusFilter),
      )
    }

    return list
  }, [sessions, studentsMap, searchQuery, statusFilter])

  const groupedByDate = useMemo(
    () => groupSessionsByTimelineDate(filteredSessions),
    [filteredSessions],
  )

  const handleSessionUpdated = (sessionId: string, newStatus: SessionStatus) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s
        const next = { ...s, status: newStatus }
        return {
          ...next,
          sessionHistoryBadge: computeSessionHistoryBadge(next),
        }
      }),
    )
  }

  const handleMarkAttendance = async (status: AttendanceStatus) => {
    if (!openSession || !user?.id) return
    if (status === 'needs_rescheduling') {
      setShowAttendanceModal(false)
      setShowRescheduleModal(true)
      return
    }

    setAttendanceBusy(true)
    try {
      const outcome = mapAttendanceToOutcome(status)
      await sessionsService.markSessionAttendance(openSession.id, outcome, {
        counselorId: user.id,
        studentId: openSession.studentId,
        attendanceNote:
          outcome === 'completed'
            ? 'Marked completed by counselor.'
            : 'Student did not show up.',
      })
      handleSessionUpdated(openSession.id, outcome)
      setShowAttendanceModal(false)
      setOpenSession(null)
    } catch (e) {
      console.error('Failed to mark attendance:', e)
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message
          : 'Could not mark attendance. Please try again.'
      alert(msg)
    } finally {
      setAttendanceBusy(false)
    }
  }

  const attendanceSlot =
    openSession &&
    (formatSlotForDisplay(getConfirmedFinalSlot(openSession)) ??
      getConfirmedFinalSlot(openSession))

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
            placeholder="Search student name or ID..."
            className="w-full bg-aurora-card border border-aurora-border rounded-[14px] py-3.5 pl-12 pr-4 text-white placeholder-aurora-text-muted focus:outline-none focus:border-aurora-blue/50"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {SESSION_HISTORY_LIST_FILTERS.map((filter) => {
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
        <div className="max-w-3xl">
          {groupedByDate.map(({ dateKey, headerDate, items }) => (
            <section key={dateKey} className="mb-6">
              <p className="text-[11px] font-semibold tracking-wider text-aurora-text-muted mb-2">
                {formatDateHeader(headerDate)}
              </p>
              <div className="h-px bg-aurora-border mb-3" />
              {items.map((session) => (
                <SessionHistoryTimelineCard
                  key={session.id}
                  session={session}
                  student={studentsMap[session.studentId] ?? null}
                  onPress={() => setOpenSession(session)}
                />
              ))}
            </section>
          ))}
        </div>
      )}

      <SessionHistoryDetailModal
        open={!!openSession && !showAttendanceModal}
        session={openSession}
        student={openSession ? studentsMap[openSession.studentId] ?? null : null}
        onClose={() => setOpenSession(null)}
        onMarkAttendance={() => {
          setShowAttendanceModal(true)
        }}
      />

      {openSession && (
        <SessionAttendanceModal
          open={showAttendanceModal}
          studentName={studentsMap[openSession.studentId]?.full_name || 'Student'}
          studentAvatar={studentsMap[openSession.studentId]?.avatar_url ?? undefined}
          sessionDate={attendanceSlot?.date ?? '—'}
          sessionTime={attendanceSlot?.time ?? ''}
          busy={attendanceBusy}
          onClose={() => {
            setShowAttendanceModal(false)
          }}
          onMarkLater={() => {
            setShowAttendanceModal(false)
          }}
          onMarkStatus={handleMarkAttendance}
        />
      )}

      {openSession && user && (
        <SendSessionInviteModal
          visible={showRescheduleModal}
          mode="propose"
          modalTitle="Propose new times"
          subtitle="Student did not attend or needs a new schedule. Send up to three options."
          submitLabel="Send new times"
          student={{
            id: openSession.studentId,
            name: studentsMap[openSession.studentId]?.full_name || 'Student',
            avatar: studentsMap[openSession.studentId]?.avatar_url ?? undefined,
          }}
          counselorId={user.id}
          onClose={() => {
            setShowRescheduleModal(false)
            setOpenSession(null)
          }}
          onSuccess={() => {
            setShowRescheduleModal(false)
            setOpenSession(null)
          }}
          onProposeSlots={async (slots, note) => {
            if (!user?.id) return
            const conversationId = `${user.id}_${openSession.studentId}`
            await sessionsService.proposeSlots(openSession.id, slots, {
              conversationId,
              counselorId: user.id,
              studentId: openSession.studentId,
              counselorName: user.full_name || 'Counselor',
              note,
              proposalKind: 'attendance_reschedule',
            })
            handleSessionUpdated(openSession.id, 'pending')
          }}
        />
      )}
    </div>
  )
}
