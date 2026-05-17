import { useState, useEffect } from 'react'
import { X, Send, Loader2, Check } from 'lucide-react'
import { sessionsService } from '../../services/sessions'
import { usersService } from '../../services/users'
import { LetterAvatar } from '../LetterAvatar'

interface Counselor {
  id: string
  full_name?: string
  avatar_url?: string
}

/** `datetime-local` values are always `YYYY-MM-DDTHH:mm` (no timezone). */
function isValidDatetimeLocal(value: string): boolean {
  const t = value.trim()
  if (!t) return false
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) return false
  const d = new Date(t)
  return !Number.isNaN(d.getTime())
}

/** `datetime-local` value → string shown in chat / Firestore */
function formatDatetimeLocalForDisplay(isoLocal: string): string {
  const t = isoLocal.trim()
  if (!isValidDatetimeLocal(t)) return ''
  const d = new Date(t)
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultDatetimeLocalValue(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 60)
  d.setSeconds(0, 0)
  return toDatetimeLocalValue(d)
}

function minDatetimeLocalValue(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  return toDatetimeLocalValue(d)
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
    if (!visible || !studentId) return
    setSelectedCounselorId(null)
    setPreferredSlotLocal(defaultDatetimeLocalValue())
    setLoading(true)
    usersService
      .getCounselorsForStudent(studentId)
      .then((rows) => setCounselors(rows as Counselor[]))
      .catch((e) => {
        console.error('Failed to load counselors:', e)
        setCounselors([])
      })
      .finally(() => setLoading(false))
  }, [visible, studentId])

  useEffect(() => {
    if (!visible || counselors.length === 0) return
    setSelectedCounselorId((prev) => {
      if (prev && counselors.some((c) => c.id === prev)) return prev
      return counselors[0]?.id ?? null
    })
  }, [visible, counselors])

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
      alert(e instanceof Error ? e.message : 'Failed to send request. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (!visible) return null

  const preferredTimeReady = isValidDatetimeLocal(preferredSlotLocal)
  const canSend =
    !!selectedCounselorId && !!note.trim() && preferredTimeReady && !sending

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
          min={minDatetimeLocalValue()}
          onChange={(e) => setPreferredSlotLocal(e.target.value)}
          className="w-full bg-white/3 border border-aurora-border rounded-xl px-3.5 py-3 text-sm text-white mb-1
                     focus:outline-none focus:border-aurora-blue/50 transition-colors [color-scheme:dark]"
        />
        {!preferredTimeReady && (
          <p className="text-xs text-aurora-text-muted mb-4">
            Use the date picker to choose a preferred time (typing DD/MM/YYYY may not register).
          </p>
        )}
        {preferredTimeReady && <div className="mb-4" />}

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

        {!canSend && !sending && counselors.length > 0 && (
          <p className="mt-3 text-xs text-aurora-text-muted text-center">
            {!selectedCounselorId
              ? 'Select a counselor above.'
              : !preferredTimeReady
                ? 'Choose a valid date and time.'
                : 'Add a short note about what you’d like to discuss.'}
          </p>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
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