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

export function CollegeCountBarChart({
  title,
  caption,
  points,
  barClassName = 'bg-aurora-secondary-blue',
  emptyHint = 'No students in this group yet.',
  minWidth = 520,
}: Props) {
  const max = Math.max(1, ...points.map((p) => p.count))
  const allZero = points.every((p) => p.count === 0)

  return (
    <div className="card-aurora p-6">
      <h3 className="text-lg font-bold text-aurora-primary-dark">{title}</h3>
      <p className="text-sm text-aurora-primary-dark/60 mt-1">{caption}</p>

      {allZero ? (
        <p className="text-sm text-aurora-primary-dark/45 mt-4">{emptyHint}</p>
      ) : (
        <div className="mt-5 overflow-x-auto pb-2">
          <div
            className="flex items-end gap-2 h-44 border-b border-aurora-primary-dark/10 px-1"
            style={{ minWidth }}
          >
            {points.map((p) => {
              const pct = p.count === 0 ? 0 : Math.max(4, (p.count / max) * 100)
              return (
                <div
                  key={p.key}
                  className="flex flex-col items-center flex-1 min-w-[48px]"
                  title={p.key}
                >
                  {p.count > 0 ? (
                    <span className="text-[10px] font-bold text-aurora-primary-dark/55 mb-1">
                      {p.count}
                    </span>
                  ) : (
                    <span className="text-[10px] mb-1 opacity-0">0</span>
                  )}
                  <div
                    className={`w-full max-w-[36px] rounded-t-md transition-all ${barClassName} ${
                      p.count === 0 ? 'opacity-25' : 'opacity-90'
                    }`}
                    style={{ height: `${pct}%` }}
                    title={`${p.key}: ${p.count}`}
                  />
                  <span className="text-xs font-extrabold text-aurora-primary-dark mt-2">
                    {p.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
