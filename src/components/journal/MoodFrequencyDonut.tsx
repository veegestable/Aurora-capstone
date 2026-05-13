type Segment = {
  mood: string
  label: string
  value: number
  color: string
  hint: string
}

type MoodFrequencyDonutProps = {
  segments: Segment[]
  centerValue: string
  centerLabel: string
  selectedMood: string | null
  onSelectMood: (mood: string | null) => void
}

export function MoodFrequencyDonut({
  segments,
  centerValue,
  centerLabel,
  selectedMood,
  onSelectMood,
}: MoodFrequencyDonutProps) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0)

  if (segments.length === 0 || total <= 0) {
    return (
      <p className="text-sm text-aurora-text-sec">
        No check-ins in this period yet.
      </p>
    )
  }

  let cumulative = 0
  const gradientStops = segments
    .map((seg) => {
      const frac = seg.value / total
      const startDeg = cumulative * 360
      cumulative += frac
      const endDeg = cumulative * 360
      return `${seg.color} ${startDeg.toFixed(3)}deg ${endDeg.toFixed(3)}deg`
    })
    .join(', ')

  const gradient = `conic-gradient(from -90deg, ${gradientStops})`
  const summary = segments.map((s) => `${s.label}: ${s.hint}`).join('; ')

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="flex flex-col items-center gap-4"
        role="img"
        aria-label={`Mood frequency. ${summary}`}
      >
        <div
          className="relative mx-auto h-44 w-44 shrink-0 rounded-full p-[14px]"
          style={{ background: gradient }}
        >
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-aurora-card border border-white/10 px-2 text-center">
            <span className="text-3xl font-extrabold text-white tabular-nums">
              {centerValue}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-aurora-text-muted mt-1">
              {centerLabel}
            </span>
          </div>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-3">
        {segments.map((s) => {
          const pct = Math.round((s.value / total) * 100)
          const active = selectedMood === s.mood
          return (
            <li key={s.mood}>
              <button
                type="button"
                onClick={() => onSelectMood(active ? null : s.mood)}
                className={`flex w-full cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                  active
                    ? 'border-aurora-purple/45 bg-[rgba(124,58,237,0.12)]'
                    : 'border-transparent hover:bg-white/5'
                }`}
              >
                <span
                  className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                <span>
                  <span className="block text-sm font-semibold text-white">
                    {s.label} ({pct}%)
                  </span>
                  <span className="block text-[10px] text-aurora-text-muted">{s.hint}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}