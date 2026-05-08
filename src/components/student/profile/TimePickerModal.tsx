import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TimePickerModalProps {
  open: boolean
  title: string
  description?: string
  initialValue?: string
  defaultValue?: string
  showClear?: boolean
  onClose: () => void
  onSave: (hhmm: string) => Promise<void> | void
  onClear?: () => Promise<void> | void
}

export function TimePickerModal({
  open,
  title,
  description,
  initialValue,
  defaultValue = '07:00',
  showClear = true,
  onClose,
  onSave,
  onClear,
}: TimePickerModalProps) {
  const [time, setTime] = useState(initialValue || defaultValue)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setTime(initialValue || defaultValue)
  }, [open, initialValue, defaultValue])

  if (!open) return null

  const handleSave = async () => {
    if (!time) return
    setBusy(true)
    try {
      await onSave(time)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const handleClear = async () => {
    if (!onClear) return
    setBusy(true)
    try {
      await onClear()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md card-aurora rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="flex-1 text-base font-bold text-aurora-primary-dark">{title}</p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 cursor-pointer hover:opacity-70 transition-opacity"
          >
            <X className="w-5 h-5 text-aurora-gray-500" />
          </button>
        </div>
        {description && (
          <p className="text-xs text-aurora-gray-500 leading-relaxed mb-3">{description}</p>
        )}

        <div className="rounded-xl border border-aurora-border bg-aurora-card-alt px-3 py-3 mb-4">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-transparent text-center text-2xl font-extrabold text-aurora-primary-dark outline-none scheme:dark"
          />
        </div>

        <div className="flex gap-2">
          {showClear && onClear && (
            <button
              onClick={handleClear}
              disabled={busy}
              className="flex-1 py-3 rounded-xl border border-aurora-border bg-aurora-card-alt
                         text-sm font-bold text-aurora-gray-500 hover:text-aurora-primary-dark
                         transition-colors cursor-pointer disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={busy}
            className="flex-1 py-3 rounded-xl border border-aurora-secondary-blue/45
                       bg-aurora-secondary-blue/16 text-sm font-bold text-[#B9CCFF]
                       hover:bg-aurora-secondary-blue/24 transition-colors cursor-pointer
                       disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}