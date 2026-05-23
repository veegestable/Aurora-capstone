import type { LucideIcon } from 'lucide-react'
import type { RoleEngagementCounts } from '../../types/audit.types'

function sumRoles(c: RoleEngagementCounts): number {
  return c.counselor + c.student + c.admin + c.other
}

function RoleRow({ label, counts }: { label: string; counts: RoleEngagementCounts }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <span className="text-xs font-semibold text-aurora-text-sec">{label}</span>
      <div className="flex flex-wrap gap-2.5 justify-end text-xs text-aurora-text-muted">
        <span>
          C <span className="text-white font-extrabold">{counts.counselor}</span>
        </span>
        <span>
          S <span className="text-white font-extrabold">{counts.student}</span>
        </span>
        <span>
          A <span className="text-white font-extrabold">{counts.admin}</span>
        </span>
        {counts.other > 0 ? (
          <span>
            · <span className="text-white font-extrabold">{counts.other}</span>
          </span>
        ) : null}
      </div>
    </div>
  )
}

type EngagementActionCardProps = {
  label: string
  icon: LucideIcon
  counts: RoleEngagementCounts
}

export function EngagementActionCard({ label, icon: Icon, counts }: EngagementActionCardProps) {
  const total = sumRoles(counts)
  return (
    <div className="card-aurora p-3.5 mb-2.5">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full bg-aurora-blue/20 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-aurora-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-white">{label}</p>
          <p className="text-xs font-semibold text-aurora-text-muted mt-0.5">Total: {total}</p>
        </div>
      </div>
      <p className="text-[10px] text-aurora-text-muted mb-2">
        C = counselor · S = student · A = admin
      </p>
      <RoleRow label="By role" counts={counts} />
    </div>
  )
}
