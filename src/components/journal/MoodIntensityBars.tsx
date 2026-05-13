import type { MoodChartAggregateRow } from '../../utils/analytics/buildMoodChartAggregates'

type MoodIntensityBarsProps = {
  items: MoodChartAggregateRow[]
  emptyMessage: string
  selectedMood: string | null
}

export function MoodIntensityBars({
  items,
  emptyMessage,
  selectedMood,
}: MoodIntensityBarsProps) {
  if (items.length === 0) {
    return <p className="text-sm text-aurora-text-sec">{emptyMessage}</p>
  }

  return (
    <ul className="flex flex-col gap-3" aria-label="Average mood intensity bars">
      {items.map((item) => {
        const widthPct = Math.max(
          10,
          Math.round((item.averageIntensity / 10) * 100),
        )
        const dim =
          selectedMood !== null && selectedMood !== item.mood ? 0.38 : 1
        return (
          <li
            key={`intensity-${item.mood}`}
            className="transition-opacity duration-200"
            style={{ opacity: dim }}
          >
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs font-bold text-white">{item.label}</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-aurora-text-sec tabular-nums">
                n={item.intensitySamples}
              </span>
              <span className="ml-auto text-[11px] font-bold text-aurora-text-muted tabular-nums">
                {item.averageIntensity.toFixed(1)} / 10
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full transition-[width] duration-500"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}