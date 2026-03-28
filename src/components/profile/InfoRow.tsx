interface InfoRowProps {
  label: string
  value: string
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="py-3 border-b border-aurora-gray-200 last:border-b-0">
      <p className="text-[11px] text-aurora-gray-400 mb-1">{label}</p>
      <p className="text-[15px] font-medium text-aurora-primary-dark">{value}</p>
    </div>
  )
}