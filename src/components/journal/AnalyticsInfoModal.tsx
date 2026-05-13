type AnalyticsInfoModalProps = {
  open: boolean
  title: string
  body: string
  onClose: () => void
}

export function AnalyticsInfoModal({
  open,
  title,
  body,
  onClose,
}: AnalyticsInfoModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analytics-guide-title"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div
        className="card-aurora max-w-md w-full p-6 border border-aurora-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="analytics-guide-title" className="text-lg font-bold text-white mb-3 font-heading">
          {title}
        </h2>
        <p className="text-sm text-aurora-text-sec whitespace-pre-line leading-relaxed">{body}</p>
        <button
          type="button"
          onClick={onClose}
          className="btn-aurora-outline mt-6 w-full cursor-pointer py-2.5 rounded-xl font-semibold"
        >
          Got it
        </button>
      </div>
    </div>
  )
}