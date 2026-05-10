import { useState, useEffect } from 'react'
import { X, Send, Loader2, Check } from 'lucide-react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { sessionsService } from '../../services/sessions'
import { LetterAvatar } from '../LetterAvatar'

interface Counselor {
  id: string
  full_name?: string
  avatar_url?: string
}

/** `datetime-local` value → string shown in chat / Firestore */
function formatDatetimeLocalForDisplay(isoLocal: string): string {
  const t = isoLocal.trim()
  if (!t) return ''
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return t
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

interface SessionRequestModalProps {
  visible: boolean
  studentId: string
  studentName?: string
  studentAvatar?: string
  onClose: () => void
  onSuccess: () => void
}

export function SessionRequestModal({
  visible,
  studentId,
  studentName,
  studentAvatar,
  onClose,
  onSuccess,
}: SessionRequestModalProps) {
  const [counselors, setCounselors] = useState<Counselor[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedCounselorId, setSelectedCounselorId] = useState<string | null>(null)
  const [note, setNote] = useState(
    "I've been feeling a bit overwhelmed and would like to talk to someone.",
  )
  /** Raw value from `<input type="datetime-local" />` (e.g. 2026-05-10T14:30) */
  const [preferredSlotLocal, setPreferredSlotLocal] = useState('')

  useEffect(() => {
    if (!visible) return
    setPreferredSlotLocal('')
    setLoading(true)
    const q = query(collection(db, 'users'), where('role', '==', 'counselor'))
    getDocs(q)
      .then((snap) => {
        const approved = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Counselor & { approval_status?: string }))
          .filter((c) => (c as Counselor & { approval_status?: string }).approval_status === 'approved'
            || !(c as Counselor & { approval_status?: string }).approval_status)
        setCounselors(approved)
      })
      .catch(() => setCounselors([]))
      .finally(() => setLoading(false))
  }, [visible])

  const handleSend = async () => {
    const preferredTime = formatDatetimeLocalForDisplay(preferredSlotLocal)
    if (!selectedCounselorId || !note.trim() || !preferredTime || sending) return

    const counselor = counselors.find((c) => c.id === selectedCounselorId)
    setSending(true)
    try {
      await sessionsService.createSessionRequest({
        studentId,
        counselorId: selectedCounselorId,
        note: note.trim(),
        preferredTime,
        studentName,
        studentAvatar,
        counselorName: counselor?.full_name,
        counselorAvatar: counselor?.avatar_url,
      })
      onSuccess()
      onClose()
    } catch (e) {
      console.error('Failed to create session request:', e)
      alert('Failed to send request. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (!visible) return null

  const preferredTimeReady = !!formatDatetimeLocalForDisplay(preferredSlotLocal).trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative w-full max-w-md card-aurora border border-aurora-border p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Request a Session</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-aurora-text-sec transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-aurora-text-sec mb-5 leading-relaxed">
          Choose a counselor and share when you&apos;d like to meet and why you&apos;d like to talk.
        </p>

        <label className="text-xs font-semibold text-aurora-text-sec uppercase tracking-wider mb-2 block">
          Select Counselor
        </label>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-aurora-blue animate-spin" />
          </div>
        ) : counselors.length === 0 ? (
          <p className="text-sm text-aurora-text-muted mb-4">No counselors available.</p>
        ) : (
          <div className="max-h-40 overflow-y-auto space-y-2 mb-5 pr-1 scrollbar-hide">
            {counselors.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setSelectedCounselorId(c.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedCounselorId === c.id
                    ? 'border-aurora-blue bg-[rgba(45,107,255,0.08)]'
                    : 'border-transparent bg-white/3 hover:bg-white/5'
                }`}
              >
                <LetterAvatar name={c.full_name ?? 'Counselor'} size={40} avatarUrl={c.avatar_url ?? undefined} />
                <span className="text-sm font-semibold text-white flex-1 text-left">
                  {c.full_name || 'Counselor'}
                </span>
                {selectedCounselorId === c.id && (
                  <div className="w-6 h-6 rounded-full bg-aurora-blue flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <label className="text-xs font-semibold text-aurora-text-sec uppercase tracking-wider mb-2 block">
          Preferred date &amp; time
        </label>
        <input
          type="datetime-local"
          value={preferredSlotLocal}
          onChange={(e) => setPreferredSlotLocal(e.target.value)}
          className="w-full bg-white/3 border border-aurora-border rounded-xl px-3.5 py-3 text-sm text-white mb-5
                     focus:outline-none focus:border-aurora-blue/50 transition-colors scheme:dark"
        />

        <label className="text-xs font-semibold text-aurora-text-sec uppercase tracking-wider mb-2 block">
          Your Note
        </label>
        <textarea
          className="w-full bg-white/3 border border-aurora-border rounded-xl p-3.5 text-sm text-white placeholder:text-aurora-text-muted resize-none focus:outline-none focus:border-aurora-blue/50 transition-colors"
          rows={3}
          placeholder="Share what you'd like to discuss..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!selectedCounselorId || !note.trim() || !preferredTimeReady || sending}
          className="mt-5 w-full btn-aurora flex items-center justify-center gap-2.5 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Send Request</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}