import { ChevronRight, Lock } from 'lucide-react'
import { STUDENT_PRIVACY_BANNER_TEXT } from '../../constants/student-privacy'
import { useStudentPrivacy } from '../../contexts/StudentPrivacyContext'

type PrivacyNoticeBannerProps = {
  message?: string
  className?: string
}

export function PrivacyNoticeBanner({
  message = STUDENT_PRIVACY_BANNER_TEXT,
  className = '',
}: PrivacyNoticeBannerProps) {
  const { openPrivacyAssurance } = useStudentPrivacy()

  return (
    <button
      type="button"
      onClick={openPrivacyAssurance}
      className={`flex w-full items-center gap-3 rounded-xl border border-[rgba(45,107,255,0.28)] bg-[rgba(45,107,255,0.12)] px-3 py-2.5 text-left transition-colors hover:bg-[rgba(45,107,255,0.18)] cursor-pointer ${className}`}
      aria-label="Open privacy and data information"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(45,107,255,0.2)]">
        <Lock className="h-3.5 w-3.5 text-aurora-secondary-blue" />
      </div>
      <span className="flex-1 text-xs font-semibold leading-relaxed text-aurora-text-sec">
        {message}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-aurora-text-muted" />
    </button>
  )
}
