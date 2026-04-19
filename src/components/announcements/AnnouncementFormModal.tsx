import { useState, useEffect, useRef } from 'react'
import { X, Image as ImageIcon, Upload, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { announcementsService } from '../../services/announcements'
import type {
  Announcement,
  AnnouncementTargetRole,
} from '../../types/announcement.types'

interface AnnouncementFormModalProps {
  /** Pass an announcement to open in Edit mode. Leave undefined/null for Create. */
  announcement?: Announcement | null
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const ROLE_OPTIONS: { key: AnnouncementTargetRole; label: string }[] = [
  { key: 'all', label: 'Everyone' },
  { key: 'student', label: 'Students only' },
  { key: 'counselor', label: 'Counselors only' },
]

export function AnnouncementFormModal({
  announcement,
  open,
  onClose,
  onSuccess,
}: AnnouncementFormModalProps) {
  const { user } = useAuth()
  const isEdit = !!announcement
  const fileRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [targetRole, setTargetRole] = useState<AnnouncementTargetRole>('all')
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [pickedPreview, setPickedPreview] = useState<string | null>(null)
  const [removedImage, setRemovedImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(announcement?.title ?? '')
    setContent(announcement?.content ?? '')
    setTargetRole(announcement?.targetRole ?? 'all')
    setExistingImageUrl(announcement?.imageUrl ?? null)
    setPickedFile(null)
    setPickedPreview(null)
    setRemovedImage(false)
    setError(null)
  }, [open, announcement])

  useEffect(() => {
    return () => {
      if (pickedPreview) URL.revokeObjectURL(pickedPreview)
    }
  }, [pickedPreview])

  if (!open) return null

  const displayImage = pickedPreview ?? (!removedImage ? existingImageUrl : null)

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setError('Selected file is not an image.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.')
      return
    }
    if (pickedPreview) URL.revokeObjectURL(pickedPreview)
    setPickedFile(f)
    setPickedPreview(URL.createObjectURL(f))
    setRemovedImage(false)
    setError(null)
  }

  const handleRemoveImage = () => {
    if (pickedPreview) URL.revokeObjectURL(pickedPreview)
    setPickedFile(null)
    setPickedPreview(null)
    setRemovedImage(true)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    const t = title.trim()
    const c = content.trim()
    if (!t) return setError('Please enter a title.')
    if (!c) return setError('Please enter the announcement content.')

    setSaving(true)
    setError(null)
    try {
      let uploadedUrl: string | null | undefined
      if (pickedFile) {
        uploadedUrl = await announcementsService.uploadAnnouncementImage(user.id, pickedFile)
      }

      if (isEdit && announcement) {
        let imageUrl: string | null | undefined = undefined
        if (uploadedUrl) imageUrl = uploadedUrl
        else if (removedImage) imageUrl = null
        await announcementsService.updateAnnouncement(announcement.id, {
          title: t,
          content: c,
          targetRole,
          ...(imageUrl === undefined ? {} : { imageUrl }),
        })
      } else {
        await announcementsService.createAnnouncement({
          title: t,
          content: c,
          targetRole,
          imageUrl: uploadedUrl ?? undefined,
          createdBy: user.id,
          createdByName: user.full_name || user.preferred_name || 'Admin',
        })
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Announcement save failed:', err)
      setError('Could not save the announcement. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-form-title"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-aurora-gray-200">
          <h2 id="announcement-form-title" className="text-lg font-extrabold text-aurora-primary-dark font-heading">
            {isEdit ? 'Edit announcement' : 'New announcement'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-aurora-gray-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-aurora-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-aurora-primary-dark/60 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Mental Health Week"
              className="w-full px-3 py-2.5 text-sm text-aurora-primary-dark bg-aurora-gray-50 rounded-lg border border-aurora-gray-200 focus:border-aurora-secondary-blue focus:ring-2 focus:ring-aurora-secondary-blue/20 outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-aurora-primary-dark/60 mb-1.5">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Write the announcement..."
              className="w-full px-3 py-2.5 text-sm text-aurora-primary-dark bg-aurora-gray-50 rounded-lg border border-aurora-gray-200 focus:border-aurora-secondary-blue focus:ring-2 focus:ring-aurora-secondary-blue/20 outline-none transition-colors resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-aurora-primary-dark/60 mb-1.5">
              Visible to
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setTargetRole(r.key)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    targetRole === r.key
                      ? 'bg-aurora-secondary-blue/10 border-aurora-secondary-blue text-aurora-secondary-blue'
                      : 'bg-aurora-gray-50 border-aurora-gray-200 text-aurora-primary-dark/60 hover:bg-aurora-gray-100'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-aurora-primary-dark/60 mb-1.5">
              Image (optional)
            </label>
            {displayImage ? (
              <div className="relative rounded-lg overflow-hidden border border-aurora-gray-200">
                <img src={displayImage} alt="Announcement preview" className="w-full h-40 object-cover" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-black/60 hover:bg-black/80 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-32 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-aurora-gray-300 bg-aurora-gray-50 hover:bg-aurora-gray-100 text-aurora-primary-dark/50 transition-colors cursor-pointer"
              >
                <ImageIcon className="w-6 h-6" />
                <span className="text-xs font-semibold">Click to upload an image</span>
                <span className="text-[10px]">PNG or JPG · up to 5 MB</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePickFile}
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-aurora-gray-200 bg-aurora-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-aurora-primary-dark/70 hover:bg-aurora-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-aurora-secondary-blue hover:bg-aurora-secondary-dark-blue rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />}
            {isEdit ? 'Save changes' : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  )
}