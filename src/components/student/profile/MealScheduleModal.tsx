import { X, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { MealScheduleItem } from '../../../types/user-settings.types'

const DEFAULT_FALLBACK_MEAL_COUNT = 3

function makeFallback(count: number): MealScheduleItem[] {
  const arr: MealScheduleItem[] = []
  for (let i = 0; i < count; i++) {
    arr.push({ id: `meal_${i + 1}`, label: `Meal ${i + 1}`, time: '' })
  }
  return arr
}

function normalizeCount(count: number, base: MealScheduleItem[]): MealScheduleItem[] {
  const next = Math.max(1, Math.min(6, Math.floor(count)))
  if (base.length === next) return base
  if (base.length > next) return base.slice(0, next)
  const extra = makeFallback(next - base.length).map((m, i) => ({
    ...m,
    id: `meal_${base.length + i + 1}`,
    label: `Meal ${base.length + i + 1}`,
  }))
  return [...base, ...extra]
}

function toFriendlyTime(time: string): string {
  const [hRaw, mRaw] = (time || '').split(':')
  const h = Number(hRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time || 'No time set yet'
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

interface MealScheduleModalProps {
  open: boolean
  initial: MealScheduleItem[] | undefined
  onClose: () => void
  onSave: (next: MealScheduleItem[]) => Promise<void> | void
}

export function MealScheduleModal({ open, initial, onClose, onSave }: MealScheduleModalProps) {
  const [draft, setDraft] = useState<MealScheduleItem[]>(
    initial?.length ? initial : makeFallback(DEFAULT_FALLBACK_MEAL_COUNT),
  )
  const [busy, setBusy] = useState(false)
  const hasMissing = useMemo(() => draft.some(m => !m.time?.trim()), [draft])

  useEffect(() => {
    if (open) setDraft(initial?.length ? initial : makeFallback(DEFAULT_FALLBACK_MEAL_COUNT))
  }, [open, initial])

  if (!open) return null

  const setCount = (next: number) => setDraft(prev => normalizeCount(next, prev))
  const setMealTime = (idx: number, time: string) =>
    setDraft(prev => prev.map((m, i) => (i === idx ? { ...m, time } : m)))

  const handleSave = async () => {
    if (hasMissing) {
      alert('Please set a time for each meal before saving.')
      return
    }
    setBusy(true)
    try {
      await onSave(draft)
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
        className="w-full sm:max-w-md card-aurora rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="flex-1 text-base font-bold text-aurora-primary-dark">Meal Schedule</p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 cursor-pointer hover:opacity-70 transition-opacity"
          >
            <X className="w-5 h-5 text-aurora-gray-500" />
          </button>
        </div>
        <p className="text-xs text-aurora-gray-500 leading-relaxed mb-3">
          Set your daily meal count and usual meal times. Aurora will ask these in mood check-ins.
        </p>

        <div className="rounded-xl border border-aurora-border bg-aurora-card-alt p-3 mb-4">
          <p className="text-[13px] font-bold text-white mb-2">Meal count per day</p>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCount(draft.length - 1)}
              disabled={draft.length <= 1}
              className="w-9 h-9 rounded-[10px] border border-aurora-secondary-blue
                         bg-aurora-secondary-blue/16 text-aurora-secondary-blue
                         flex items-center justify-center cursor-pointer
                         disabled:opacity-55 disabled:cursor-not-allowed
                         disabled:border-aurora-border disabled:bg-aurora-card disabled:text-aurora-gray-400"
              aria-label="Decrease meals"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-lg font-extrabold text-aurora-primary-dark">{draft.length}</p>
              <p className="text-[11px] text-aurora-gray-400">
                meal{draft.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              onClick={() => setCount(draft.length + 1)}
              disabled={draft.length >= 6}
              className="w-9 h-9 rounded-[10px] border border-aurora-secondary-blue
                         bg-aurora-secondary-blue/16 text-aurora-secondary-blue
                         flex items-center justify-center cursor-pointer
                         disabled:opacity-55 disabled:cursor-not-allowed
                         disabled:border-aurora-border disabled:bg-aurora-card disabled:text-aurora-gray-400"
              aria-label="Increase meals"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          {draft.map((meal, idx) => (
            <div
              key={meal.id}
              className={`flex items-center justify-between gap-3 py-3 ${
                idx === 0 ? '' : 'border-t border-aurora-border'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-aurora-primary-dark">{meal.label}</p>
                <p className="text-xs text-aurora-gray-500 mt-0.5">
                  {meal.time ? toFriendlyTime(meal.time) : 'No time set yet'}
                </p>
              </div>
              <input
                type="time"
                value={meal.time}
                onChange={(e) => setMealTime(idx, e.target.value)}
                className="px-3 py-2 rounded-lg border border-aurora-secondary-blue
                           bg-aurora-secondary-blue/16 text-aurora-secondary-blue
                           text-xs font-bold outline-none cursor-pointer scheme:dark"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-aurora-border bg-aurora-card-alt
                       text-sm font-bold text-aurora-gray-500 hover:text-aurora-primary-dark
                       transition-colors cursor-pointer"
          >
            Close
          </button>
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