interface StatCardProps {
  icon: React.ReactNode
  count: string | number
  label: string
  accent?: string
}

export function StatCard({ icon, count, label, accent }: StatCardProps) {
  return (
    <div className={`card-aurora flex flex-col gap-2 p-5 min-h-[120px] ${accent ?? ''}`}>
      {icon}
      <span className="text-3xl font-extrabold text-aurora-primary-dark tracking-tight">{count}</span>
      <span className="text-xs text-aurora-primary-dark/60">{label}</span>
    </div>
  )
}