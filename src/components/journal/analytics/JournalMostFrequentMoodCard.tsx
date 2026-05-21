import { HelpCircle } from 'lucide-react'
import type { DominantMoodDisplay } from '../../../utils/analytics/dominantMoodDisplay'
import { hexToRgba } from '../../../utils/analytics/dominantMoodDisplay'

type Props = {
  display: DominantMoodDisplay
  onGuide?: () => void
  /** Compact row layout for Today view (mobile side-by-side with check-ins). */
  compact?: boolean
}

export function JournalMostFrequentMoodCard({ display, onGuide, compact = false }: Props) {
  const borderColor = hexToRgba(display.accentColor, 0.75)
  const bgColor = hexToRgba(display.accentColor, 0.14)

  if (compact) {
    return (
      <div
        className="flex-1 rounded-xl border-[1.5px] p-3"
        style={{ backgroundColor: bgColor, borderColor }}
      >
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-bold tracking-wide text-[#9AA9C8] uppercase">
            Most frequent mood
          </p>
          {onGuide ? (
            <button
              type="button"
              onClick={onGuide}
              className="cursor-pointer p-0.5 text-[#9AA9C8] hover:text-white"
              aria-label="About most frequent mood"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <img
            src={display.iconUrl}
            alt=""
            className="h-8 w-8 object-contain"
            aria-hidden
          />
          <p className="text-2xl font-extrabold text-white">{display.label}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full overflow-hidden rounded-[22px] border-[1.5px] p-5 shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
      style={{
        backgroundColor: bgColor,
        borderColor,
        boxShadow: `0 10px 24px ${hexToRgba(display.accentColor, 0.2)}`,
      }}
    >
      <div className="flex items-center justify-center gap-1.5">
        <p className="text-[11px] font-extrabold tracking-wide text-white uppercase">
          Most frequent mood
        </p>
        {onGuide ? (
          <button
            type="button"
            onClick={onGuide}
            className="cursor-pointer p-0.5 text-[#9AA9C8] hover:text-white"
            aria-label="About most frequent mood"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-col items-center justify-center gap-2.5 pt-4 pb-1">
        <img
          src={display.iconUrl}
          alt=""
          className="h-14 w-14 object-contain"
          aria-hidden
        />
        <p className="text-center text-[28px] font-extrabold text-white">{display.label}</p>
      </div>
    </div>
  )
}
