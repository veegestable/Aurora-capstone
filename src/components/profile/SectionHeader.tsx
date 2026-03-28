interface SectionHeaderProps {
  title: string
  icon?: React.ReactNode
}

export function SectionHeader({ title, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-1.5 mb-2.5 mt-5">
      {icon}
      <span className="text-xs font-extrabold tracking-widest text-aurora-gray-400 uppercase">
        {title}
      </span>
    </div>
  )
}