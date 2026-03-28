import { TrendingUp, Star } from 'lucide-react'

interface ProfileStatCardProps {
  label: string
  value: string
  sub: string
  subColorClass: string
  isTop?: boolean
}

export function ProfileStatCard({ label, value, sub, subColorClass, isTop }: ProfileStatCardProps) {
  return (
    <div className="flex-1 card-aurora p-3.5!">
      <p className="text-[10px] font-bold tracking-wider text-aurora-gray-400 uppercase mb-1.5">
        {label}
      </p>
      <p className="text-[22px] font-extrabold text-aurora-primary-dark mb-1">{value}</p>
      <div className="flex items-center gap-1">
        {isTop ? (
          <Star className={`w-3 h-3 ${subColorClass} fill-current`} />
        ) : (
          <TrendingUp className={`w-3 h-3 ${subColorClass}`} />
        )}
        <span className={`text-[11px] font-semibold ${subColorClass}`}>{sub}</span>
      </div>
    </div>
  )
}