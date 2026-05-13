import type { MoodChartAggregateRow } from '../../utils/analytics/buildMoodChartAggregates'

type MoodDurationBarsProps = {
  items: MoodChartAggregateRow[]
  emptyMessage: string
  selectedMood: string | null
}

export function MoodDurationBars({
  items,
  emptyMessage,
  selectedMood,
}: MoodDurationBarsProps) {
  if (items.length === 0) {
    return <p className="text-sm text-aurora-text-sec">{emptyMessage}</p>
  }

  const maxMinutes = Math.max(1, items[0]?.totalMinutes ?? 1)

  return (
    <ul className="flex flex-col gap-3" aria-label="Mood duration bars">
      {items.map((item) => {
        const widthPct = Math.max(
          10,
          Math.round((item.totalMinutes / maxMinutes) * 100),
        )
        const dim =
          selectedMood !== null && selectedMood !== item.mood ? 0.38 : 1
        return (
          <li
            key={`duration-${item.mood}`}
            className="transition-opacity duration-200"
            style={{ opacity: dim }}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">{item.label}</span>
              <span className="text-[11px] font-bold text-aurora-text-muted tabular-nums">
                {item.totalMinutes} min
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