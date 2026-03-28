interface PrivacyRowProps {
  icon: React.ReactNode
  title: string
  description: string
}

export function PrivacyRow({ icon, title, description }: PrivacyRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-aurora-gray-200 last:border-b-0">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-aurora-primary-dark mb-0.5">{title}</p>
        <p className="text-xs text-aurora-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}