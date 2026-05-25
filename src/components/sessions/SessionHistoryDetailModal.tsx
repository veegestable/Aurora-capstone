import { useEffect, useState } from 'react'
import { X, Loader2, Save, Trash2 } from 'lucide-react'
import { sessionsService, type SessionNote } from '../../services/sessions'
import type { Session, SessionStatus } from '../../types/session.types'

const STATUS_OPTIONS: SessionStatus[] = [
  'confirmed',
  'completed',
  'missed',
  'needs_rescheduling',
  'rescheduled',
]

interface SessionHistoryDetailModalProps {
  isOpen: boolean
  session: Session | null
  peerName: string
  counselorId: string
  onClose: () => void
  onSaved: () => Promise<void> | void
}

export function SessionHistoryDetailModal({
  isOpen,
  session,
  peerName,
  counselorId,
  onClose,
  onSaved,
}: SessionHistoryDetailModalProps) {
  const [status, setStatus] = useState<SessionStatus>('confirmed')
  const [attendanceNote, setAttendanceNote] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  const [notes, setNotes] = useState<SessionNote[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [draftNote, setDraftNote] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  useEffect(() => {
    if (!isOpen || !session) return
    setStatus(session.status)
    setAttendanceNote(session.attendanceNote || '')
    setCancelReason(session.cancelReason || '')
  }, [isOpen, session])

  useEffect(() => {
    if (!isOpen || !session?.id) return
  
    const sessionId: string = session.id
    let cancelled = false
  
    async function loadNotes() {
      setLoadingNotes(true)
      try {
        const rows = await sessionsService.getSessionNotes(sessionId)
        if (!cancelled) setNotes(rows)
      } catch {
        if (!cancelled) setNotes([])
      } finally {
        if (!cancelled) setLoadingNotes(false)
      }
    }
  
    void loadNotes()
    return () => {
      cancelled = true
    }
  }, [isOpen, session?.id])

  if (!isOpen || !session) return null

  const slot = session.finalSlot ?? session.confirmedSlot ?? session.proposedSlots?.[0]

  const reloadNotes = async () => {
    if (!session?.id) return
    const rows = await sessionsService.getSessionNotes(session.id)
    setNotes(rows)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl card-aurora border border-aurora-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-aurora-border">
          <div>
            <h3 className="text-lg font-extrabold text-white">Session Details</h3>
            <p className="text-sm text-aurora-text-sec">{peerName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-aurora-text-sec hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-aurora-bg rounded-xl border border-aurora-border p-3">
              <p className="text-aurora-text-muted text-xs mb-1">Session ID</p>
              <p className="text-white break-all">{session.id}</p>
            </div>
            <div className="bg-aurora-bg rounded-xl border border-aurora-border p-3">
              <p className="text-aurora-text-muted text-xs mb-1">Scheduled Slot</p>
              <p className="text-white">{slot ? `${slot.date}${slot.time ? ` at ${slot.time}` : ''}` : 'No slot selected'}</p>
            </div>
            <div className="bg-aurora-bg rounded-xl border border-aurora-border p-3 md:col-span-2">
              <p className="text-aurora-text-muted text-xs mb-1">Location</p>
              <p className="text-white">Office of Guidance and Counseling (OGC)</p>
            </div>
          </div>

          {session.studentRequestNote && (
            <div className="bg-aurora-bg rounded-xl border border-aurora-border p-3">
              <p className="text-aurora-text-muted text-xs mb-1">Student Request Note</p>
              <p className="text-white text-sm whitespace-pre-wrap">{session.studentRequestNote}</p>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">Attendance & Status</h4>

            <div>
              <label className="text-xs text-aurora-text-muted block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SessionStatus)}
                className="w-full bg-aurora-bg border border-aurora-border rounded-xl px-3 py-2.5 text-sm text-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="bg-[#0B0D30] text-white">
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-aurora-text-muted block mb-1">Attendance Note</label>
              <textarea
                rows={3}
                value={attendanceNote}
                onChange={(e) => setAttendanceNote(e.target.value)}
                placeholder="ex. Student attended and discussed exam stress..."
                className="w-full bg-aurora-bg border border-aurora-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-aurora-text-muted"
              />
            </div>

            {(status === 'cancelled' || status === 'missed' || status === 'needs_rescheduling') && (
              <div>
                <label className="text-xs text-aurora-text-muted block mb-1">Reason</label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Add reason for cancellation/missed/reschedule..."
                  className="w-full bg-aurora-bg border border-aurora-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-aurora-text-muted"
                />
              </div>
            )}

            <button
              className="btn-aurora inline-flex items-center gap-2 cursor-pointer disabled:opacity-70"
              disabled={savingStatus}
              onClick={async () => {
                try {
                  setSavingStatus(true)
                  await sessionsService.updateSessionStatus({
                    sessionId: session.id,
                    status,
                    attendanceNote: attendanceNote.trim() || '',
                    cancelReason:
                      status === 'cancelled' || status === 'missed' || status === 'needs_rescheduling'
                        ? cancelReason.trim() || ''
                        : '',
                    performedBy: counselorId,
                    performedByRole: 'counselor',
                  })
                  await onSaved()
                } finally {
                  setSavingStatus(false)
                }
              }}
            >
              {savingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save session update
            </button>
          </div>

          <div className="space-y-3 pt-2 border-t border-aurora-border">
            <h4 className="text-sm font-bold text-white">Session Notes</h4>

            <textarea
              rows={3}
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="Add counseling note..."
              className="w-full bg-aurora-bg border border-aurora-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-aurora-text-muted"
            />
            <button
              className="btn-aurora cursor-pointer"
              disabled={!draftNote.trim()}
              onClick={async () => {
                await sessionsService.createSessionNote({
                  sessionId: session.id,
                  counselorId,
                  note: draftNote,
                })
                setDraftNote('')
                await reloadNotes()
              }}
            >
              Add note
            </button>

            {loadingNotes ? (
              <div className="text-sm text-aurora-text-sec">Loading notes...</div>
            ) : notes.length === 0 ? (
              <div className="text-sm text-aurora-text-sec">No session notes yet.</div>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="bg-aurora-bg border border-aurora-border rounded-xl p-3">
                    {editingNoteId === n.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full bg-[#0F1530] border border-aurora-border rounded-lg px-3 py-2 text-sm text-white"
                        />
                        <div className="flex gap-2">
                          <button
                            className="btn-aurora cursor-pointer"
                            disabled={!editingText.trim()}
                            onClick={async () => {
                              await sessionsService.updateSessionNote({ noteId: n.id, note: editingText })
                              setEditingNoteId(null)
                              setEditingText('')
                              await reloadNotes()
                            }}
                          >
                            Save
                          </button>
                          <button
                            className="px-3 py-2 rounded-lg border border-aurora-border text-sm text-aurora-text-sec hover:text-white cursor-pointer"
                            onClick={() => {
                              setEditingNoteId(null)
                              setEditingText('')
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-white whitespace-pre-wrap">{n.note}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-aurora-text-muted">Updated {n.updatedAt.toLocaleString()}</p>
                          <div className="flex gap-2">
                            <button
                              className="px-2.5 py-1.5 rounded-md border border-aurora-border text-xs text-aurora-text-sec hover:text-white cursor-pointer"
                              onClick={() => {
                                setEditingNoteId(n.id)
                                setEditingText(n.note)
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="px-2.5 py-1.5 rounded-md border border-red-500/30 text-xs text-red-300 hover:text-red-200 inline-flex items-center gap-1 cursor-pointer"
                              onClick={async () => {
                                await sessionsService.deleteSessionNote(n.id)
                                await reloadNotes()
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}