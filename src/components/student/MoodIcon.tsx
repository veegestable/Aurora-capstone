import type { SVGProps } from 'react'

type MoodName = 'happy' | 'sad' | 'angry' | 'surprise' | 'neutral'

interface MoodIconProps extends SVGProps<SVGSVGElement> {
  name: MoodName
  size?: number
}

/**
 * Vector replacement for the emoji glyphs used in the Mood Check-in.
 * The face stroke inherits `currentColor`, so the caller controls color via
 * Tailwind text classes or inline `style={{ color }}`.
 */
export function MoodIcon({ name, size = 32, ...rest }: MoodIconProps) {
  const common = {
    viewBox: '0 0 32 32',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
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