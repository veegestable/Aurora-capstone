import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Plus } from 'lucide-react'
import { announcementsService } from '../../services/announcements'
import type { Announcement } from '../../types/announcement.types'
import { AnnouncementAdminCard } from './AnnouncementAdminCard'
import { AnnouncementFormModal } from './AnnouncementFormModal'
import { AnnouncementGuideModal } from './AnnouncementGuideModal'

const PREVIEW_COUNT = 3

export function AdminDashboardAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const unsub = announcementsService.subscribeAll(
      (list) => setItems(list),
      (err) => console.error('Admin dashboard announcements:', err),
    )
    return unsub
  }, [])

  const preview = items.slice(0, PREVIEW_COUNT)

  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-aurora-purple" />
          <h3 className="text-[17px] font-extrabold text-white">Announcements</h3>
          <AnnouncementGuideModal audience="admin" iconClassName="w-4 h-4 text-aurora-text-muted" />
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 text-sm font-semibold text-aurora-blue hover:text-aurora-blue-light transition-colors cursor-pointer"
        >
          <Plus className="w-[18px] h-[18px]" />
          Announcement
        </button>
      </div>

      {preview.length === 0 ? (
        <p className="text-sm text-aurora-text-sec py-4">No announcements yet.</p>
      ) : (
        <div className="space-y-2.5">
          {preview.map((item) => (
            <AnnouncementAdminCard
              key={item.id}
              announcement={item}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}

      {items.length > PREVIEW_COUNT ? (
        <Link
          to="/admin/announcements"
          className="inline-flex items-center gap-1 text-sm font-semibold text-aurora-blue hover:text-aurora-blue-light"
        >
          View all announcements →
        </Link>
      ) : null}

      <AnnouncementFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        announcement={null}
        onSuccess={() => setModalOpen(false)}
      />
    </section>
  )
}
