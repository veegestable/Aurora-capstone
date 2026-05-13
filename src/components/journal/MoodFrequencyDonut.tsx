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

      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-aurora-text-sec">
        {segments.map((s) => {
          const active = selectedMood === s.mood
          return (
            <li key={s.mood}>
              <button
                type="button"
                onClick={() => onSelectMood(active ? null : s.mood)}
                className={`flex items-center gap-1.5 rounded-full border px-2 py-1 transition-colors cursor-pointer ${
                  active
                    ? 'border-aurora-purple/45 bg-[rgba(124,58,237,0.16)] text-white'
                    : 'border-transparent hover:bg-white/5'
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="font-semibold">{s.label}</span>
                <span>({s.hint})</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}