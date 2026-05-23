interface StatCardProps {
  icon: React.ReactNode
  count: string | number
  label: string
  accent?: boolean
}

export function StatCard({ icon, count, label, accent = false }: StatCardProps) {
  return (
    <div
      className={`card-aurora flex flex-col p-3.5 min-h-[112px] ${
        accent ? 'border-amber-500/35' : ''
      }`}
    >
      <div className="mb-2">{icon}</div>
      <span className="text-[26px] font-extrabold text-white tracking-tight ml-2.5">{count}</span>
      <span className="text-[11px] font-semibold text-aurora-text-sec mt-1 ml-2.5">{label}</span>
    </div>
  )
}