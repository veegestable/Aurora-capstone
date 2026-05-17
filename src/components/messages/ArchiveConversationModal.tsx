import { Loader2 } from 'lucide-react'

interface ArchiveConversationModalProps {
  open: boolean
  contactName: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ArchiveConversationModal({
  open,
  contactName,
  busy,
  onCancel,
  onConfirm,
}: ArchiveConversationModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-conversation-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !busy && onCancel()}
        aria-hidden
      />

      <div className="relative w-full max-w-sm card-aurora border border-aurora-border p-5 shadow-2xl">
        <h2
          id="archive-conversation-title"
          className="text-lg font-extrabold text-white mb-2"
        >
          Hide conversation?
        </h2>
        <p className="text-sm text-aurora-text-sec leading-relaxed mb-5">
          This removes <span className="font-bold text-white">{contactName}</span> from
          your list. It does not delete messages or the student&apos;s chat.
        </p>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl border border-aurora-border text-sm font-bold text-white hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl border border-amber-500/55 bg-amber-500/20 text-sm font-extrabold text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Archive message'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
