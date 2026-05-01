import { useState } from 'react'

interface LetterAvatarProps {
  name: string
  size?: number
  className?: string
  avatarUrl?: string
}

export function LetterAvatar({
  name,
  size = 44,
  className = '',
  avatarUrl
}: LetterAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false)
  const letter = name?.trim().charAt(0).toUpperCase() || '?'

  const showImage = avatarUrl && !hasImageError

  return (
    <div
      className={`flex items-center justify-center rounded-full shrink-0 overflow-hidden ${
        showImage ? '' : 'bg-aurora-blue-800/40 border border-aurora-blue-700/30'
      } ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42
      }}
    >
      {showImage ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span className="font-bold text-aurora-blue-400">{letter}</span>
      )}
    </div>
  )
}