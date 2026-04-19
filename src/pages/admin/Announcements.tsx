import { useEffect, useMemo, useState } from 'react'
import { Plus, Megaphone, RefreshCw } from 'lucide-react'
import { announcementsService } from '../../services/announcements'
import type {
  Announcement,
  AnnouncementTargetRole,
} from '../../types/announcement.types'
import { AnnouncementAdminCard } from '../../components/announcements/AnnouncementAdminCard'
import { AnnouncementFormModal } from '../../components/announcements/AnnouncementFormModal'

type Filter = 'all' | AnnouncementTargetRole

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'student', label: 'Students' },
  { key: 'counselor', label: 'Counselors' },
]

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [filterIdx, setFilterIdx] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsub = announcementsService.subscribeAll(
      (list) => {
        setItems(list)
        setLoading(false)
      },
      (err) => {
        console.error('subscribeAll error:', err)
        setLoading(false)
      }
    )
    return unsub
  }, [])

  const refresh = async () => {
    setLoading(true)
    try {
      setItems(await announcementsService.listAll())
    } catch (err) {
      console.error('listAll error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (filterIdx === 0) return items
    const key = FILTERS[filterIdx].key
    return items.filter((a) => a.targetRole === key || a.targetRole === 'all')
  }, [items, filterIdx])

  const handleNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (a: Announcement) => {
    setEditing(a)
    setModalOpen(true)
  }

  const handleDelete = async (a: Announcement) => {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return
    setDeletingId(a.id)
    try {
      await announcementsService.deleteAnnouncement(a.id)
    } catch (err) {
      console.error('deleteAnnouncement error:', err)
      alert('Could not delete the announcement. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-primary-dark/40 uppercase">
            Admin
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading mt-1">
            Announcements
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-lg text-aurora-secondary-blue hover:bg-aurora-secondary-blue/10 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Refresh announcements"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-aurora-secondary-blue hover:bg-aurora-secondary-dark-blue rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Announcement</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f, idx) => (
          <button
            key={`${f.key}-${idx}`}
            onClick={() => setFilterIdx(idx)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
              filterIdx === idx
                ? 'bg-aurora-secondary-blue text-white'
                : 'bg-aurora-primary-dark/5 text-aurora-primary-dark/60 hover:bg-aurora-primary-dark/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-secondary-blue" />
          <span className="ml-3 text-aurora-primary-dark/50 text-sm">Loading announcements...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="w-12 h-12 text-aurora-primary-dark/20 mx-auto mb-3" />
          <p className="text-aurora-primary-dark/50 text-sm">
            {items.length === 0
              ? 'No announcements yet.'
              : 'No announcements match this filter.'}
          </p>
          {items.length === 0 && (
            <button
              onClick={handleNew}
              className="mt-4 inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-aurora-secondary-blue hover:bg-aurora-secondary-blue/10 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create your first announcement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <AnnouncementAdminCard
              key={a.id}
              announcement={a}
              onEdit={() => handleEdit(a)}
              onDelete={() => handleDelete(a)}
              busy={deletingId === a.id}
            />
          ))}
        </div>
      )}

      <AnnouncementFormModal
        open={modalOpen}
        announcement={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}