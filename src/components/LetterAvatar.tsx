interface LetterAvatarProps {
  name: string
  size?: number
  className?: string
}

export function LetterAvatar({
  name,
  size = 44,
  className = ''
}: LetterAvatarProps) {
  const letter = name?.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-aurora-blue-800/40 border border-aurora-blue-700/30 font-bold text-aurora-blue-400 shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42
      }}
    >
      {letter}
    </div>
  )
}