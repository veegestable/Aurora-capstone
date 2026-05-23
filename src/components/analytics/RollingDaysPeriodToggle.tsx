import { useEffect, useRef, useState } from 'react'

export type RollingDaysPeriod = 7 | 30

type Props = {
  value: RollingDaysPeriod
  onChange: (days: RollingDaysPeriod) => void
}

/**
 * 7 / 30 day pill toggle — matches mobile `RollingDaysPeriodToggle`.
 */
export function RollingDaysPeriodToggle({ value, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const d7Ref = useRef<HTMLButtonElement>(null)
  const d30Ref = useRef<HTMLButtonElement>(null)
  const [thumb, setThumb] = useState({ x: 0, w: 0 })

  useEffect(() => {
    const btn = value === 7 ? d7Ref.current : d30Ref.current
    const track = trackRef.current
    if (!btn || !track) return
    const trackRect = track.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    setThumb({
      x: btnRect.left - trackRect.left,
      w: btnRect.width,
    })
  }, [value])

  return (
    <div
      ref={trackRef}
      className="relative inline-flex rounded-full border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.14)] p-[3px]"
    >
      <span
        className="pointer-events-none absolute top-[3px] bottom-[3px] rounded-full border border-white/20 bg-aurora-purple transition-all duration-200"
        style={{ left: thumb.x, width: thumb.w }}
        aria-hidden
      />
      {([7, 30] as const).map((days) => {
        const active = value === days
        return (
          <button
            key={days}
            ref={days === 7 ? d7Ref : d30Ref}
            type="button"
            onClick={() => onChange(days)}
            className={`relative z-10 min-w-[64px] rounded-full px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              active ? 'text-white' : 'text-aurora-text-muted hover:text-white'
            }`}
            aria-pressed={active}
          >
            {days} days
          </button>
        )
      })}
    </div>
  )
}
