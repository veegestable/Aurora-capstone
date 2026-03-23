export function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium border-[1.5px] transition-colors shrink-0 cursor-pointer ${
        isActive
          ? 'bg-aurora-secondary-blue border-aurora-secondary-blue text-white'
          : 'bg-transparent border-aurora-primary-light/30 text-aurora-primary-dark/60 hover:border-aurora-primary-dark/30'
      }`}
      aria-label={`Filter by ${label}`}
    >
      {label}
    </button>
  )
}