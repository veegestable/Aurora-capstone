import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface AdminQuickActionRowProps {
  to: string
  title: string
  description: string
  icon: React.ReactNode
}

export function AdminQuickActionRow({ to, title, description, icon }: AdminQuickActionRowProps) {
  return (
    <Link
      to={to}
      className="card-aurora flex items-center gap-3.5 p-4 hover:bg-white/[0.03] transition-colors"
      aria-label={title}
    >
      <div className="w-12 h-12 shrink-0 flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-base">{title}</p>
        <p className="text-[13px] text-aurora-text-sec mt-0.5">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-aurora-text-muted shrink-0" />
    </Link>
  )
}
