import { ChevronDown, ChevronRight } from 'lucide-react'

interface PrivacyRowProps {
  icon: React.ReactNode
  title: string
  description: string
  preview: string
  expanded: boolean
  onToggle: () => void
}

export function PrivacyRow({ icon, title, description, preview, expanded, onToggle }: PrivacyRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-left flex items-start gap-3 py-3 border-b border-aurora-border last:border-b-0 cursor-pointer"
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-aurora-primary-dark mb-0.5">{title}</p>
        <p className="text-xs text-aurora-gray-500 leading-relaxed">
          {expanded ? description : preview}
        </p>
      </div>
      <div className="mt-0.5 shrink-0 text-aurora-gray-400">
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </div>
    </button>
  )
}