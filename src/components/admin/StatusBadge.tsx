import type { CounselorApprovalStatus } from "../../types/user.types"

const STATUS_CONFIG: Record<string, { 
  label: string
  bg: string
  text: string
  ring: string
}> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-500/15',
    text: 'text-amber-500',
    ring: 'ring-amber-500/30'
  },
  approved: {
    label: 'Approved',
    bg: 'bg-green-500/15',
    text: 'text-green-500',
    ring: 'ring-green-500/30'
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-red-500/15',
    text: 'text-red-500',
    ring: 'ring-red-500/30'
  }
}

export function StatusBadge({ status }: { status?: CounselorApprovalStatus }) {
  const s = status ?? 'pending'
  const { label, bg, text, ring } = STATUS_CONFIG[s] ?? STATUS_CONFIG.pending

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${bg} ${text} ${ring}`}>
      {label}
    </span>
  )
}