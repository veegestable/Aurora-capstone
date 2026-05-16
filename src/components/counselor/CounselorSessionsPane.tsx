import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Loader2, X } from 'lucide-react'
import { sessionsService } from '../../services/sessions'
import { counselorService } from '../../services/counselor'
import { SessionCard } from '../sessions/SessionCard'
import type { Session, SessionStatus } from '../../types/session.types'
import { useAuth } from '../../contexts/AuthContext'

interface CounselorSessionsPaneProps {
  visible: boolean
  counselorId: string
  onClose: () => void
}

type TabKey = 'pending' | 'upcoming' | 'reschedule' | 'completed' | 'expired' | 'closed'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'reschedule', label: 'Reschedule' },
  { key: 'completed', label: 'Completed' },
  { key: 'expired', label: 'Expired' },
  { key: 'closed', label: 'Closed' },
]

const PENDING_STATUSES: SessionStatus[] = ['requested', 'pending']
const UPCOMING_STATUSES: SessionStatus[] = ['confirmed']
const RESCHEDULE_STATUSES: SessionStatus[] = ['needs_rescheduling', 'rescheduled']
const COMPLETED_STATUSES: SessionStatus[] = ['completed']
const EXPIRED_STATUSES: SessionStatus[] = ['expired']
// 'closed' is the catch-all for missed / cancelled (and any future status we haven't bucketed).

function bucketFor(status: SessionStatus): TabKey {
  if (PENDING_STATUSES.includes(status)) return 'pending'
  if (UPCOMING_STATUSES.includes(status)) return 'upcoming'
  if (RESCHEDULE_STATUSES.includes(status)) return 'reschedule'
  if (COMPLETED_STATUSES.includes(status)) return 'completed'
  if (EXPIRED_STATUSES.includes(status)) return 'expired'
  return 'closed'
}

const EMPTY_LABELS: Record<TabKey, string> = {
  pending: 'No pending requests',
  upcoming: 'No upcoming sessions',
  reschedule: 'Nothing needs rescheduling',
  completed: 'No completed sessions yet',
  expired: 'No expired sessions',
  closed: 'Nothing here yet',
}

/**
 * Counselor-side modal pane: groups all of the counselor's sessions by status
 * and routes to Session History (with state) when a chip is selected.
 */
export function CounselorSessionsPane({
  visible,
  counselorId,
  onClose,
}: CounselorSessionsPaneProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [studentNames, setStudentNames] = useState<Map<string, string>>(new Map())
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible || !counselorId) return
    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        const [list, students] = await Promise.all([
          sessionsService.getSessionsForCounselor(counselorId),
          counselorService.getStudents(user?.college_code ?? ''),
        ])
        if (cancelled) return
        setSessions(list)
        setStudentNames(new Map(students.map(s => [s.id, s.full_name || 'Student'])))
      } catch (e) {
        console.error('Failed to load counselor sessions:', e)
        if (!cancelled) setSessions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [visible, counselorId])

  const grouped = useMemo(() => {
    const buckets: Record<TabKey, Session[]> = {
      pending: [], upcoming: [], reschedule: [], completed: [], expired: [], closed: [],
    }
    sessions.forEach(s => buckets[bucketFor(s.status)].push(s))
    return buckets
  }, [sessions])

  if (!visible) return null

  const visibleSessions = grouped[activeTab]

  // Plan §3.2: Completed → Session History with detail open. Expired → plain redirect.
  // Other statuses also redirect to Session History; future state can be honored there.
  const handleSelectSession = (s: Session) => {
    onClose()
    if (s.status === 'completed') {
      navigate('/counselor/session-history', {
        state: { openSessionId: s.id, statusFilter: 'completed' },
      })
      return
    }
    if (s.status === 'expired') {
      navigate('/counselor/session-history', { state: { statusFilter: 'expired' } })
      return
    }
    navigate('/counselor/session-history', { state: { statusFilter: s.status } })
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="counselor-sessions-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f0f11] w-full max-w-lg max-h-[85vh] sm:rounded-3xl rounded-t-3xl border-t sm:border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-aurora-blue/15 flex items-center justify-center">
              <CalendarClock className="w-4 h-4 text-aurora-blue" />
            </div>
            <h2 id="counselor-sessions-title" className="text-base font-bold text-white">
              Sessions
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sessions pane"
            className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5 text-aurora-text-sec" />
          </button>
        </header>

        {/* Tabs */}
        <nav
          className="flex gap-2 px-5 pt-3 overflow-x-auto scrollbar-hide"
          aria-label="Session category"
        >
          {TABS.map((t) => {
            const active = activeTab === t.key
            const count = grouped[t.key].length
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-aurora-blue/15 border-aurora-blue/40 text-aurora-blue'
                    : 'bg-white/5 border-white/10 text-aurora-text-sec hover:bg-white/10'
                }`}
                aria-pressed={active}
              >
                {t.label}
                <span
                  className={`text-[10px] font-extrabold tabular-nums ${
                    active ? 'text-aurora-blue' : 'text-aurora-text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-aurora-blue" />
              <span className="ml-2 text-sm text-aurora-text-muted">Loading sessions…</span>
            </div>
          ) : visibleSessions.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="w-10 h-10 text-aurora-text-muted/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-aurora-text-sec">
                {EMPTY_LABELS[activeTab]}
              </p>
            </div>
          ) : (
            visibleSessions.map((s) => {
              const peerName = studentNames.get(s.studentId)
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectSession(s)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectSession(s)
                    }
                  }}
                  className="rounded-xl cursor-pointer transition-transform hover:-translate-y-0.5
                             focus-visible:outline focus-visible:outline-aurora-blue/60"
                >
                  <SessionCard
                    session={s}
                    peerName={peerName ? `Student: ${peerName}` : undefined}
                  />
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}