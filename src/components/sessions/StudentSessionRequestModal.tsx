import { useState, useEffect } from 'react'
import { X, Send, Loader2 } from 'lucide-react'

export interface SessionRequestFormData {
  preferredDate: Date
  note: string
}

function isValidDatetimeLocal(value: string): boolean {
  const t = value.trim()
  if (!t) return false
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) return false
  const d = new Date(t)
  return !Number.isNaN(d.getTime())
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
  return toDatetimeLocalValue(new Date())
}

const DEFAULT_NOTE =
  "I've been feeling a bit overwhelmed lately and would love to chat about some stress management strategies."

interface StudentSessionRequestModalProps {
  visible: boolean
  sending?: boolean
  onClose: () => void
  onSend: (data: SessionRequestFormData) => void
}

/** Step 2 (mobile parity): preferred time + note, sent from an open chat thread. */
export function StudentSessionRequestModal({
  visible,
  sending = false,
  onClose,
  onSend,
}: StudentSessionRequestModalProps) {
  const [preferredSlotLocal, setPreferredSlotLocal] = useState(defaultDatetimeLocalValue)
  const [note, setNote] = useState(DEFAULT_NOTE)

  useEffect(() => {
    if (!visible) return
    setPreferredSlotLocal(defaultDatetimeLocalValue())
    setNote(DEFAULT_NOTE)
  }, [visible])

  const preferredTimeReady = isValidDatetimeLocal(preferredSlotLocal)
  const canSend = preferredTimeReady && !!note.trim() && !sending

  const handleSend = () => {
    if (!canSend) return
    onSend({
      preferredDate: new Date(preferredSlotLocal.trim()),
      note: note.trim(),
    })
  }

  if (!visible) return null

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
            Use the date picker to choose a preferred time.
          </p>
        )}
        {preferredTimeReady && <div className="mb-4" />}

        <label className="text-xs font-semibold text-aurora-text-sec uppercase tracking-wider mb-2 block">
          Your Note
        </label>
        <textarea
          className="w-full bg-white/3 border border-aurora-border rounded-xl p-3.5 text-sm text-white placeholder:text-aurora-text-muted resize-none focus:outline-none focus:border-aurora-blue/50 transition-colors"
          rows={4}
          placeholder="Share what you'd like to discuss..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

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
              <span>Send Session Request</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
