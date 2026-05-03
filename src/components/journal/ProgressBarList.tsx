interface ProgressBarItem {
  label: string
  count: number
}

interface ProgressBarListProps {
  items: ProgressBarItem[]
  barColor?: string
  labelColor?: string
}

export function ProgressBarList({ items, barColor = 'bg-aurora-blue', labelColor = 'text-aurora-green' }: ProgressBarListProps) {
  if (!items.length) return null
  const max = items[0].count

  return (
    <>
      {items.map(({ label, count }) => (
        <div key={label} className="mb-2.5">
          <div className="flex justify-between text-sm mb-1">
            <span className={`${labelColor} font-medium capitalize`}>{label.replace('-', ' ')}</span>
            <span className="text-aurora-text-sec font-bold">{count}</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </>
  )
}