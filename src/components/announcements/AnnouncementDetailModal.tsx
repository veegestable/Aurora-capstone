import { X, Megaphone } from 'lucide-react'
import type { Announcement } from '../../types/announcement.types'

interface AnnouncementDetailModalProps {
  announcement: Announcement | null
  showAuthor?: boolean
  onClose: () => void
}

function formatFullDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function AnnouncementDetailModal({
  announcement,
  showAuthor = false,
  onClose,
}: AnnouncementDetailModalProps) {
  if (!announcement) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-detail-title"
    >
      <div
        className="card-aurora w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-aurora-border">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-aurora-blue" />
            <span className="text-xs font-bold tracking-[0.15em] text-aurora-text-muted uppercase">
              Announcement
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close announcement"
          >
            <X className="w-5 h-5 text-aurora-text-sec" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {announcement.imageUrl ? (
            <img
              src={announcement.imageUrl}
              alt=""
              className="w-full h-48 object-cover"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-32 bg-linear-to-br from-[rgba(45,107,255,0.25)] to-[rgba(45,107,255,0.05)] flex items-center justify-center">
              <Megaphone className="w-10 h-10 text-aurora-blue/60" />
            </div>
          )}

          <div className="p-5">
            <h3
              id="announcement-detail-title"
              className="text-xl font-bold text-white font-heading mb-2"
            >
              {announcement.title}
            </h3>
            <p className="text-sm text-aurora-text-sec leading-relaxed whitespace-pre-wrap">
              {announcement.content}
            </p>
            <p className="text-xs text-aurora-text-muted mt-4">
              {showAuthor && announcement.createdByName
                ? `${announcement.createdByName} · `
                : ''}
              {formatFullDate(announcement.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}