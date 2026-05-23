import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { CalendarClock, Loader2, X } from 'lucide-react'
import { sessionsService } from '../../services/sessions'
import { LetterAvatar } from '../LetterAvatar'
import { db } from '../../config/firebase'
import {
  buildCounselorSessionOverviewItems,
  buildCounselorSessionsSheetSections,
  pendingSessionStatusLabel,
  type CounselorSessionOverviewItem,
} from '../../utils/counselorSessionOverview'

interface CounselorSessionsPaneProps {
  visible: boolean
  counselorId: string
  onClose: () => void
}

export function CounselorSessionsPane({
  visible,
  counselorId,
  onClose,
}: CounselorSessionsPaneProps) {
  const navigate = useNavigate()
  const [items, setItems] = useState<CounselorSessionOverviewItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible || !counselorId) return
    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        const list = await sessionsService.getSessionsForCounselor(counselorId)
        const overview = await buildCounselorSessionOverviewItems(
          list as unknown as Array<Record<string, unknown>>,
          async (studentId) => {
            try {
              const snap = await getDoc(doc(db, 'users', studentId))
              if (!snap.exists()) return { name: 'Student' }
              const u = snap.data() as Record<string, unknown>
              return {
                name: String(u.full_name ?? u.fullName ?? 'Student'),
                avatar:
                  typeof u.avatar_url === 'string' ? u.avatar_url : undefined,
              }
            } catch {
              return { name: 'Student' }
            }
          },
        )
        if (!cancelled) setItems(overview)
      } catch (e) {
        console.error('Failed to load counselor sessions:', e)
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => { cancelled = true }
  }, [visible, counselorId])

  if (!visible) return null

  const sections = buildCounselorSessionsSheetSections(items)

  const openSession = (item: CounselorSessionOverviewItem) => {
    onClose()
    navigate('/counselor/session-history', {
      state: { openSessionId: item.id, statusFilter: item.status },
    })
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

        <p className="px-5 pt-2 pb-3 text-xs text-aurora-text-sec leading-relaxed">
          Student requests, invites, scheduled, and outcomes.
        </p>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-aurora-blue" />
              <span className="ml-2 text-sm text-aurora-text-muted">Loading sessions…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="w-10 h-10 text-aurora-text-muted/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">All caught up</p>
              <p className="text-xs text-aurora-text-muted mt-2 max-w-xs mx-auto">
                No open requests or agreed sessions to show right now.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {sections.map((section) => (
                <section key={section.key}>
                  <div className="mb-2">
                    <h3 className="text-sm font-extrabold text-white">{section.title}</h3>
                    <p className="text-[11px] text-aurora-text-muted mt-0.5 leading-snug">
                      {section.subtitle}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openSession(item)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10
                                     hover:bg-white/8 transition-colors cursor-pointer text-left"
                        >
                          <LetterAvatar
                            name={item.studentName}
                            size={40}
                            avatarUrl={item.studentAvatar}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {item.studentName}
                            </p>
                            {item.scheduleSummary ? (
                              <p className="text-[11px] text-aurora-text-sec truncate mt-0.5">
                                {item.scheduleSummary}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-[10px] font-extrabold tracking-wide px-2 py-1 rounded-full
                                           bg-aurora-blue/15 border border-aurora-blue/30 text-aurora-blue">
                            {pendingSessionStatusLabel(item.category)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
