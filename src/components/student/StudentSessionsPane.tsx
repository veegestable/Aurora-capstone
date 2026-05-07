import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, MessageSquare, X, Loader2 } from 'lucide-react'
import { sessionsService } from '../../services/sessions'
import { SessionCard } from '../sessions/SessionCard'
import type { Session, SessionStatus } from '../../types/session.types'

interface StudentSessionsPaneProps {
  visible: boolean
  studentId: string
  onClose: () => void
}

type TabKey = 'future' | 'past' | 'closed'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'future', label: 'Future' },
  { key: 'past', label: 'Past' },
  { key: 'closed', label: 'Closed' },
]

// Anything not in FUTURE or PAST falls through to the 'closed' bucket
// (expired / missed / cancelled / rescheduled — and any future SessionStatus we add).
const FUTURE_STATUSES: SessionStatus[] = ['requested', 'pending', 'confirmed', 'needs_rescheduling']
const PAST_STATUSES: SessionStatus[] = ['completed']

function bucketFor(status: SessionStatus): TabKey {
  if (FUTURE_STATUSES.includes(status)) return 'future'
  if (PAST_STATUSES.includes(status)) return 'past'
  return 'closed'
}

/**
 * Modal that surfaces the student's sessions split into Future / Past / Closed,
 * with a one-tap shortcut to the Messages page.
 */
export function StudentSessionsPane({ visible, studentId, onClose }: StudentSessionsPaneProps) {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [counselorNames, setCounselorNames] = useState<Map<string, string>>(new Map())
  const [activeTab, setActiveTab] = useState<TabKey>('future')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!visible || !studentId) return
    let cancelled = false

    const run = async () => {
      setIsLoading(true)
      try {
        const list = await sessionsService.getSessionsForStudent(studentId)
        if (cancelled) return
        setSessions(list)
        const names = await sessionsService.getCounselorNamesForSessions(list)
        if (!cancelled) setCounselorNames(names)
      } catch (e) {
        console.error('Failed to load student sessions:', e)
        if (!cancelled) setSessions([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [visible, studentId])

  const grouped = useMemo(() => {
    const buckets: Record<TabKey, Session[]> = { future: [], past: [], closed: [] }
    sessions.forEach((s) => buckets[bucketFor(s.status)].push(s))
    return buckets
  }, [sessions])

  if (!visible) return null

  const visibleSessions = grouped[activeTab]

  return (
    <div
      className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-sessions-title"
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
            <h2 id="student-sessions-title" className="text-base font-bold text-white">
              My Sessions
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
        <nav className="flex gap-2 px-5 pt-3" aria-label="Session category">
          {TABS.map((t) => {
            const active = activeTab === t.key
            const count = grouped[t.key].length
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${active ? 'bg-aurora-blue/15 border-aurora-blue/40 text-aurora-blue' : 'bg-white/5 border-white/10 text-aurora-text-sec hover:bg-white/10'}`}
                aria-pressed={active}
              >
                {t.label}
                <span className={`text-[10px] font-extrabold tabular-nums ${active ? 'text-aurora-blue' : 'text-aurora-text-muted'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-aurora-blue" />
              <span className="ml-2 text-sm text-aurora-text-muted">Loading sessions…</span>
            </div>
          ) : visibleSessions.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="w-10 h-10 text-aurora-text-muted/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-aurora-text-sec">
                {activeTab === 'future'
                  ? 'No upcoming sessions'
                  : activeTab === 'past'
                    ? 'No past appointments yet'
                    : 'Nothing here yet'}
              </p>
              <p className="text-xs text-aurora-text-muted mt-1">
                Use Request Session on the dashboard to start a new one.
              </p>
            </div>
          ) : (
            visibleSessions.map((s) => {
              const peerName = counselorNames.get(s.counselorId)
              return (
                <SessionCard
                  key={s.id}
                  session={s}
                  peerName={peerName ? `with ${peerName}` : undefined}
                />
              )
            })
          )}
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-white/5 bg-[#0a0a0a]">
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate('/student/messages')
            }}
            className="w-full flex items-center justify-center gap-2 bg-aurora-blue hover:bg-aurora-blue-light text-white py-3 rounded-xl font-bold transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            Go to Messages
          </button>
        </footer>
      </div>
    </div>
  )
}