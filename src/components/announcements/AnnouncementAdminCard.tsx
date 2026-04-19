import { Pencil, Trash2, Megaphone } from 'lucide-react'
import type {
  Announcement,
  AnnouncementTargetRole,
} from '../../types/announcement.types'

interface AnnouncementAdminCardProps {
  announcement: Announcement
  onEdit: () => void
  onDelete: () => void
  busy?: boolean
}

const ROLE_LABEL: Record<AnnouncementTargetRole, string> = {
  all: 'Everyone',
  student: 'Students',
  counselor: 'Counselors',
}

const ROLE_STYLES: Record<AnnouncementTargetRole, string> = {
  all: 'text-aurora-secondary-blue bg-aurora-secondary-blue/10 border-aurora-secondary-blue/30',
  student: 'text-green-600 bg-green-500/10 border-green-500/30',
  counselor: 'text-purple-600 bg-purple-500/10 border-purple-500/30',
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function AnnouncementAdminCard({
  announcement,
  onEdit,
  onDelete,
  busy,
}: AnnouncementAdminCardProps) {
  return (
    <article className="card-aurora p-0 overflow-hidden flex">
      <div className="w-28 sm:w-36 shrink-0 bg-aurora-gray-100">
        {announcement.imageUrl ? (
          <img
            src={announcement.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-aurora-secondary-blue/10">
            <Megaphone className="w-6 h-6 text-aurora-secondary-blue/70" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 p-4 flex flex-col justify-between gap-2">
        <div>
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-sm font-bold text-aurora-primary-dark line-clamp-1 flex-1">
              {announcement.title}
            </h3>
            <span
              className={`shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${ROLE_STYLES[announcement.targetRole]}`}
            >
              {ROLE_LABEL[announcement.targetRole]}
            </span>
          </div>
          <p className="text-xs text-aurora-primary-dark/60 line-clamp-2 leading-relaxed">
            {announcement.content}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-aurora-primary-dark/40 truncate">
            {announcement.createdByName || 'Unknown'} · {formatDate(announcement.createdAt)}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              disabled={busy}
              className="p-1.5 rounded-lg text-aurora-secondary-blue hover:bg-aurora-secondary-blue/10 transition-colors cursor-pointer disabled:opacity-40"
              aria-label={`Edit announcement: ${announcement.title}`}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40"
              aria-label={`Delete announcement: ${announcement.title}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}