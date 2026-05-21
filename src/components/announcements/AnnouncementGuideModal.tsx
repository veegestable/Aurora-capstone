import { useState } from 'react'
import { CircleHelp } from 'lucide-react'
import {
  announcementGuideForAudience,
  type AnnouncementGuideAudience,
} from '../../constants/announcements/announcementGuideCopy'

type Props = {
  audience: AnnouncementGuideAudience
  /** Extra classes on the trigger button (e.g. shrink-0, ml-1). */
  className?: string
  iconClassName?: string
  ariaLabel?: string
}

export function AnnouncementGuideModal({
  audience,
  className = '',
  iconClassName = 'w-4 h-4 text-aurora-text-muted',
  ariaLabel = 'How announcements work',
}: Props) {
  const [open, setOpen] = useState(false)
  const guide = announcementGuideForAudience(audience)

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        className={`p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0 ${className}`}
      >
        <CircleHelp className={iconClassName} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-5"
          style={{ backgroundColor: 'rgba(3,8,24,0.55)' }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-guide-title"
        >
          <div
            className="w-full max-w-md bg-aurora-card border border-aurora-border rounded-2xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              <CircleHelp className="w-5 h-5 text-aurora-blue shrink-0 mt-0.5" />
              <h3
                id="announcement-guide-title"
                className="text-base font-extrabold text-white"
              >
                {guide.title}
              </h3>
            </div>
            <p className="text-sm text-aurora-text-sec whitespace-pre-line leading-relaxed">
              {guide.body}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full min-h-[40px] rounded-full px-3 py-2.5
                         bg-[rgba(45,107,255,0.18)] border border-[rgba(45,107,255,0.45)]
                         text-white text-sm font-bold
                         hover:bg-[rgba(45,107,255,0.28)] transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
