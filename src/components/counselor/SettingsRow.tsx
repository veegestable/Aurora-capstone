import { ChevronRight } from 'lucide-react'

interface SettingsRowProps {
  icon: React.ReactNode
  label: string
  onPress?: () => void
  rightElement?: React.ReactNode
}

export function SettingsRow({ icon, label, onPress, rightElement }: SettingsRowProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={!onPress && !rightElement}
      className={`flex items-center w-full py-4 px-4 border-b border-aurora-gray-200 last:border-b-0
                  ${onPress ? 'hover:bg-aurora-gray-50 cursor-pointer' : ''}
                  transition-colors`}
    >
      <div className="w-[34px] flex justify-center mr-3.5 shrink-0">{icon}</div>
      <span className="flex-1 text-[15px] font-medium text-aurora-primary-dark text-left">{label}</span>
      {rightElement || (onPress ? <ChevronRight className="w-[18px] h-[18px] text-aurora-gray-400" /> : null)}
    </button>
  )
}