export type RosterCountBarPoint = {
  key: string
  label: string
  count: number
}

type Props = {
  title: string
  caption: string
  points: RosterCountBarPoint[]
  barClassName?: string
  emptyHint?: string
  minWidth?: number
}

/** Matches tailwind h-44 (11rem) — plot area for bars only */
const CHART_PLOT_HEIGHT_PX = 176

export function CollegeCountBarChart({
  title,
  caption,
  points,
  barClassName = 'bg-aurora-blue',
  emptyHint = 'No students in this group yet.',
  minWidth = 520,
}: Props) {
  const max = Math.max(1, ...points.map((p) => p.count))
  const allZero = points.every((p) => p.count === 0)

  return (
    <div className="card-aurora p-3.5 mb-3">
      <h3 className="text-base font-extrabold text-white">{title}</h3>
      <p className="text-xs text-aurora-text-sec mt-1 leading-relaxed">{caption}</p>

      {allZero ? (
        <p className="text-xs text-aurora-text-muted mt-4">{emptyHint}</p>
      ) : (
        <div className="mt-4 overflow-x-auto pb-2">
          <div
            className="flex items-end gap-2 border-b border-aurora-border-light px-1"
            style={{ minWidth, height: CHART_PLOT_HEIGHT_PX }}
          >
            {points.map((p) => {
              const barHeightPx =
                p.count === 0
                  ? 0
                  : Math.max(6, Math.round((p.count / max) * (CHART_PLOT_HEIGHT_PX - 24)))

              return (
                <div
                  key={p.key}
                  className="flex flex-col items-center flex-1 min-w-[48px] h-full justify-end"
                  title={p.key}
                >
                  {p.count > 0 ? (
                    <span className="text-[10px] font-bold text-aurora-text-sec mb-1 shrink-0">
                      {p.count}
                    </span>
                  ) : null}
                  <div
                    className={`w-full max-w-[36px] min-w-[12px] rounded-t-md shrink-0 ${barClassName} ${
                      p.count === 0 ? 'opacity-25' : 'opacity-90'
                    }`}
                    style={{ height: barHeightPx }}
                    title={`${p.key}: ${p.count}`}
                  />
                </div>
              )}
            )}
          </div>
          <div className="flex gap-2 mt-2 px-1" style={{ minWidth }}>
            {points.map((p) => (
              <span
                key={p.key}
                className="flex-1 min-w-[48px] text-center text-[11px] font-extrabold text-white"
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
