interface ToggleRowProps {
  icon: React.ReactNode
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  statusBadge?: string
}

export function ToggleRow({
  icon,
  label,
  checked,
  onChange,
  disabled,
  statusBadge,
}: ToggleRowProps) {
  return (
    <div
      className={`flex items-center py-3.5 border-b border-aurora-border last:border-b-0 ${
        disabled ? 'opacity-55' : ''
      }`}
    >
      <div className="mr-3 shrink-0">{icon}</div>
      <span className="flex-1 text-sm font-medium text-aurora-primary-dark">{label}</span>
      {statusBadge ? (
        <span
          className={`mr-3 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${
            checked
              ? 'border-[rgba(34,197,94,0.45)] bg-[rgba(34,197,94,0.14)] text-[#86EFAC]'
              : 'border-[rgba(148,163,184,0.45)] bg-[rgba(148,163,184,0.14)] text-[#B6C2DA]'
          }`}
        >
          {statusBadge}
        </span>
      ) : null}
      <label className={`relative inline-flex items-center ${disabled ? '' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer disabled:cursor-not-allowed"
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