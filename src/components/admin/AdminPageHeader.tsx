interface AdminPageHeaderProps {
  kicker?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function AdminPageHeader({
  kicker = 'Admin Portal',
  title,
  subtitle,
  action,
}: AdminPageHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${subtitle ? '' : ''}`}>
      <div>
        <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-text-muted uppercase">
          {kicker}
        </p>
        <h2 className="text-[26px] font-extrabold text-white mt-1.5 leading-tight">{title}</h2>
        {subtitle ? (
          <p className="text-sm text-aurora-text-sec mt-2 leading-relaxed max-w-2xl">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
