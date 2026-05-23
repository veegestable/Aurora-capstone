import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, CircleHelp, Loader2, Trash2, X } from 'lucide-react'
import { sessionsService } from '../../services/sessions'
import { counselorService } from '../../services/counselor'
import { useAuth } from '../../contexts/AuthContext'
import { LetterAvatar } from '../LetterAvatar'
import { ModalPortal } from '../common/ModalPortal'
import { formatTimeAgo } from '../../utils/formatters'
import {
  buildCounselorSessionOverviewItems,
  buildCounselorSessionsSheetSections,
  pendingSessionCategoryStyle,
  pendingSessionStatusLabel,
  type CounselorSessionOverviewItem,
} from '../../utils/counselorSessionOverview'
import {
  loadHiddenCounselorSheetSessionIds,
  saveHiddenCounselorSheetSessionIds,
} from '../../utils/counselorSessionsSheetStorage'

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
  const { user } = useAuth()
  const [items, setItems] = useState<CounselorSessionOverviewItem[]>([])
  const [loading, setLoading] = useState(false)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [sectionGuide, setSectionGuide] = useState<{ title: string; body: string } | null>(
    null,
  )

  useEffect(() => {
    if (!visible || !counselorId) return
    setHiddenIds(loadHiddenCounselorSheetSessionIds(counselorId))
  }, [visible, counselorId])

  useEffect(() => {
    if (!visible || !counselorId) return
    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        const [list, students] = await Promise.all([
          sessionsService.getSessionsForCounselor(counselorId),
          counselorService.getStudentsForCounselor(counselorId, {
            activeCollegeCode: user?.college_code,
          }),
        ])
        const studentById = new Map(
          students.map((s) => [
            s.id,
            {
              name: s.full_name?.trim() || 'Student',
              avatar: s.avatar_url ?? undefined,
            },
          ]),
        )

        const overview = await buildCounselorSessionOverviewItems(
          list as unknown as Array<Record<string, unknown>>,
          async (studentId) =>
            studentById.get(studentId) ?? { name: 'Student' },
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
    return () => {
      cancelled = true
    }
  }, [visible, counselorId, user?.college_code])

  const visibleItems = useMemo(
    () => items.filter((item) => !hiddenIds.includes(item.id)),
    [items, hiddenIds],
  )

  const sections = useMemo(
    () => buildCounselorSessionsSheetSections(visibleItems),
    [visibleItems],
  )

  const hideSessionCard = (sessionId: string) => {
    setHiddenIds((prev) => {
      if (prev.includes(sessionId)) return prev
      const next = [...prev, sessionId]
      saveHiddenCounselorSheetSessionIds(counselorId, next)
      return next
    })
  }

  const openSession = (item: CounselorSessionOverviewItem) => {
    onClose()
    if (
      item.category === 'student_request_pending' ||
      item.category === 'counselor_invite_pending'
    ) {
      navigate('/counselor/messages', { state: { studentId: item.studentId } })
      return
    }
    navigate('/counselor/session-history', {
      state: { openSessionId: item.id, statusFilter: item.status },
    })
  }

  if (!visible) return null

  return (
    <ModalPortal open={visible}>
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="counselor-sessions-title"
        onClick={() => {
          if (sectionGuide) setSectionGuide(null)
          else onClose()
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0c1028] w-full max-w-lg max-h-[78vh] sm:max-h-[85vh] rounded-t-[22px] sm:rounded-2xl border border-white/8 shadow-2xl flex flex-col overflow-hidden pb-3 sm:pb-0 mb-0 sm:mb-4"
        >
          <div className="w-10 h-1 rounded-full bg-white/12 mx-auto mt-2.5 mb-3.5 sm:hidden" />

          <header className="flex items-center justify-between px-[18px] pb-2">
            <h2 id="counselor-sessions-title" className="text-[19px] font-extrabold text-white">
              Sessions
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sessions pane"
              className="p-1.5 rounded-2xl bg-white/6 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-[22px] h-[22px] text-aurora-text-sec" />
            </button>
          </header>

          <p className="px-[18px] text-[13px] text-aurora-text-sec leading-snug mb-3">
            Student requests, invites, scheduled, and outcomes.
          </p>

          <div className="flex-1 overflow-y-auto px-[18px] pb-7">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-aurora-blue" />
                <span className="ml-2 text-sm text-aurora-text-muted">Loading sessions…</span>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-9 px-3">
                <CalendarClock className="w-10 h-10 text-aurora-text-muted mx-auto mb-3.5" />
                <p className="text-[17px] font-bold text-white">All caught up</p>
                <p className="text-sm text-aurora-text-muted mt-2 leading-relaxed">
                  No open requests or agreed sessions to show right now.
                </p>
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="text-center py-9 px-3">
                <CalendarClock className="w-10 h-10 text-aurora-text-muted mx-auto mb-3.5" />
                <p className="text-[17px] font-bold text-white">Nothing visible</p>
                <p className="text-sm text-aurora-text-muted mt-2 leading-relaxed">
                  Every row here is hidden on this device only. Open Messages or Session History
                  for the full picture.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {sections.map((section) => (
                  <section key={section.key} className={section.sectionIndex > 0 ? 'pt-3.5' : ''}>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <h3 className="text-[11px] font-bold tracking-wide text-aurora-text-muted uppercase">
                        {section.title}
                      </h3>
                      {section.subtitle.trim() ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSectionGuide({ title: section.title, body: section.subtitle })
                          }
                          className="p-0.5 rounded cursor-pointer hover:bg-white/5"
                          aria-label={`${section.title} info`}
                        >
                          <CircleHelp className="w-3.5 h-3.5 text-aurora-text-sec" />
                        </button>
                      ) : null}
                    </div>
                    <ul className="space-y-2.5">
                      {section.items.map((item) => {
                        const pill = pendingSessionCategoryStyle(item.category)
                        const notePreview = item.studentRequestNote.trim()
                        const snippet =
                          notePreview.length > 100
                            ? `${notePreview.slice(0, 100)}…`
                            : notePreview

                        return (
                          <li
                            key={item.id}
                            className="flex items-stretch rounded-[14px] border border-aurora-border bg-aurora-card overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => openSession(item)}
                              className="flex flex-1 min-w-0 items-start gap-3 py-3 pl-3 pr-1.5 text-left cursor-pointer hover:bg-white/[0.03] transition-colors"
                            >
                              <LetterAvatar
                                name={item.studentName}
                                size={48}
                                avatarUrl={item.studentAvatar}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-base font-bold text-white truncate">
                                  {item.studentName}
                                </p>
                                {item.scheduleSummary ? (
                                  <p className="text-xs text-aurora-text-sec mt-1 line-clamp-2">
                                    {item.scheduleSummary}
                                  </p>
                                ) : null}
                                {snippet ? (
                                  <p className="text-xs text-[#C1CEE9] mt-1.5 line-clamp-2 leading-snug">
                                    {snippet}
                                  </p>
                                ) : null}
                                <p className="text-[11px] text-aurora-text-muted mt-1.5">
                                  Updated {formatTimeAgo(item.updatedAt)}
                                </p>
                              </div>
                              <span
                                className="shrink-0 self-start max-w-[120px] text-center text-[10px] font-extrabold leading-tight px-2 py-1.5 rounded-[10px] border"
                                style={{
                                  backgroundColor: pill.bg,
                                  borderColor: pill.border,
                                  color: pill.text,
                                }}
                              >
                                {pendingSessionStatusLabel(item.category)}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => hideSessionCard(item.id)}
                              aria-label="Hide session from this list"
                              className="shrink-0 px-3.5 pt-3 text-aurora-text-muted hover:text-white cursor-pointer"
                            >
                              <Trash2 className="w-[18px] h-[18px]" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

        {sectionGuide ? (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSectionGuide(null)}
          >
            <div
              className="max-w-sm w-full card-aurora border border-aurora-border p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-white mb-2">{sectionGuide.title}</h3>
              <p className="text-sm text-aurora-text-sec leading-relaxed">{sectionGuide.body}</p>
              <button
                type="button"
                onClick={() => setSectionGuide(null)}
                className="mt-4 w-full py-2.5 rounded-xl bg-aurora-blue text-white font-bold text-sm cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </ModalPortal>
  )
}
