import { useState, type SVGProps } from 'react'
import { MOOD_ICON_PNG } from '../../constants/mood/moodIconPng'
import type { MoodIconName } from '../../constants/mood/moodIconPng'

type MoodVectorProps = {
  name: MoodIconName
  size?: number
} & SVGProps<SVGSVGElement>

function MoodIconVector({ name, size = 32, ...rest }: MoodVectorProps) {
  const common = {
    viewBox: '0 0 32 32',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor' as const,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  }

  switch (name) {
    case 'happy':
      return (
        <svg {...common}>
          <circle cx="11" cy="13" r="1.4" fill="currentColor" />
          <circle cx="21" cy="13" r="1.4" fill="currentColor" />
          <path d="M10 19c1.8 2.2 4 3.3 6 3.3s4.2-1.1 6-3.3" />
        </svg>
      )
    case 'sad':
      return (
        <svg {...common}>
          <circle cx="11" cy="13" r="1.4" fill="currentColor" />
          <circle cx="21" cy="13" r="1.4" fill="currentColor" />
          <path d="M10 22c1.8-2.2 4-3.3 6-3.3s4.2 1.1 6 3.3" />
        </svg>
      )
    case 'angry':
      return (
        <svg {...common}>
          <path d="M8 11l4 1.6" />
          <path d="M24 11l-4 1.6" />
          <circle cx="11.5" cy="14.5" r="1.3" fill="currentColor" />
          <circle cx="20.5" cy="14.5" r="1.3" fill="currentColor" />
          <path d="M11 21h10" />
        </svg>
      )
    case 'surprise':
      return (
        <svg {...common}>
          <path d="M9 11.5l3-1" />
          <path d="M23 11.5l-3-1" />
          <circle cx="11.5" cy="14" r="1.3" fill="currentColor" />
          <circle cx="20.5" cy="14" r="1.3" fill="currentColor" />
          <ellipse cx="16" cy="21" rx="2.5" ry="3" />
        </svg>
      )
    case 'neutral':
    default:
      return (
        <svg {...common}>
          <circle cx="11" cy="13" r="1.4" fill="currentColor" />
          <circle cx="21" cy="13" r="1.4" fill="currentColor" />
          <path d="M11 21h10" />
        </svg>
      )
  }
}

type MoodIconProps = {
  name: MoodIconName
  size?: number
  /** Accessible name for PNG `<img>` (recommended whenever `variant` is `asset`) */
  ariaLabel?: string
  /** `'asset'` = `public/moodIcon/*.png` (mobile parity); `'vector'` = legacy SVG only */
  variant?: 'asset' | 'vector'
} & Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'aria-label'>

/**
 * Mood glyph: **`moodIcon` PNG when `variant="asset"`**, SVG fallback when load fails or `variant="vector"`.
 */
export function MoodIcon({
  name,
  size = 32,
  variant = 'asset',
  ariaLabel,
  ...svgRest
}: MoodIconProps) {
  const [assetFailed, setAssetFailed] = useState(false)
  const src = MOOD_ICON_PNG[name]

  if (variant === 'vector' || assetFailed || !src) {
    return <MoodIconVector name={name} size={size} {...svgRest} aria-hidden />
  }

  const alt =
    ariaLabel ??
    ({
      happy: 'Happy',
      sad: 'Sad',
      angry: 'Angry',
      surprise: 'Surprise',
      neutral: 'Neutral',
    }[name] ?? name)

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="object-contain select-none shrink-0"
      decoding="async"
      loading="lazy"
      onError={() => setAssetFailed(true)}
    />
  )
}