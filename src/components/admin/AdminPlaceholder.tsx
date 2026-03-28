import { Construction } from 'lucide-react'

export function AdminPlaceholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-full bg-aurora-secondary-blue/10 flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-aurora-secondary-blue" />
      </div>
      <h2 className="text-2xl font-extrabold text-aurora-primary-dark font-heading mb-2">{title}</h2>
      <p className="text-aurora-primary-dark/50 text-sm text-center max-w-md">
        {description ?? 'This page is scaffolded and ready for feature implementation.'}
      </p>
    </div>
  )
}