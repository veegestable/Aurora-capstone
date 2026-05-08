import { ChevronRight } from 'lucide-react'

interface SettingsRowProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  rightElement?: React.ReactNode
}

export function SettingsRow({ icon, label, onClick, rightElement }: SettingsRowProps) {
  const right =
    rightElement ??
    (onClick ? <ChevronRight className="w-[18px] h-[18px] text-aurora-gray-400" /> : null)

  const inner = (
    <>
      <div className="w-9 flex justify-center mr-3 shrink-0">{icon}</div>
      <span className="flex-1 text-left text-[15px] font-medium text-aurora-primary-dark">
        {label}
      </span>
      {right}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center py-3 border-b border-aurora-border last:border-b-0
                   cursor-pointer hover:opacity-90 transition-opacity"
      >
        {inner}
      </button>
    )
  }
  return (
    <div className="flex items-center py-3 border-b border-aurora-border last:border-b-0">
      {inner}
    </div>
  )
}