interface ToggleRowProps {
  icon: React.ReactNode
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}

export function ToggleRow({ icon, label, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center py-3.5 border-b border-aurora-gray-200 last:border-b-0">
      <div className="mr-3 shrink-0">{icon}</div>
      <span className="flex-1 text-sm font-medium text-aurora-primary-dark">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className="w-11 h-6 rounded-full transition-colors
                      bg-aurora-gray-300 peer-checked:bg-aurora-secondary-blue
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                      after:bg-white after:rounded-full after:h-5 after:w-5
                      after:transition-transform peer-checked:after:translate-x-full"
        />
      </label>
    </div>
  )
}