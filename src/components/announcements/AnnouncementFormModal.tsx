import { useState, useEffect, useRef } from 'react'
import { X, Image as ImageIcon, Upload, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { announcementsService } from '../../services/announcements'
import {
  isCollegeCode,
  resolveCollegeCodeFromUserData,
  type CollegeCode,
} from '../../constants/colleges'
import type {
  Announcement,
  AnnouncementTargetRole,
  AnnouncementVisibility,
} from '../../types/announcement.types'

interface AnnouncementFormModalProps {
  /** Pass an announcement to open in Edit mode. Leave undefined/null for Create. */
  announcement?: Announcement | null
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const ADMIN_ROLE_OPTIONS: { key: AnnouncementTargetRole; label: string }[] = [
  { key: 'all', label: 'Everyone' },
  { key: 'student', label: 'Students only' },
  { key: 'counselor', label: 'Counselors only' },
]

function targetRoleToVisibility(tr: AnnouncementTargetRole): AnnouncementVisibility {
  if (tr === 'student') return 'students_all'
  if (tr === 'counselor') return 'counselors_all'
  return 'students_all'
}

const inputClass =
  'w-full px-3.5 py-3 text-sm text-white bg-aurora-card rounded-xl border border-aurora-border placeholder:text-aurora-text-muted focus:border-aurora-blue focus:ring-2 focus:ring-aurora-blue/25 outline-none transition-colors'

const labelClass =
  'block text-xs font-semibold text-aurora-text-sec mb-2 tracking-wide'

export function AnnouncementFormModal({
  announcement,
  open,
  onClose,
  onSuccess,
}: AnnouncementFormModalProps) {
  const { user } = useAuth()
  const isEdit = !!announcement
  const isCounselor = user?.role === 'counselor'
  const isAdmin = user?.role === 'admin'
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

  const imageField = (
    <div>
      <label className={labelClass}>Image (optional)</label>
      {displayImage ? (
        <div className="relative rounded-xl overflow-hidden border border-aurora-border">
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
          className="w-full h-32 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-aurora-border bg-aurora-card hover:bg-aurora-card-alt text-aurora-text-sec transition-colors cursor-pointer"
        >
          <ImageIcon className="w-6 h-6 text-aurora-blue" />
          <span className="text-xs font-bold text-white">
            {isCounselor ? 'Add image from gallery' : 'Click to upload an image'}
          </span>
          <span className="text-[10px] text-aurora-text-muted">PNG or JPG · up to 5 MB</span>
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
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    const t = title.trim()
    const c = content.trim()
    if (!t) return setError('Please enter a title.')
    if (!c) return setError('Please enter the announcement content.')

    if (isCounselor && !isEdit) {
      const cc = resolveCollegeCodeFromUserData(
        user as unknown as Record<string, unknown>,
      )
      if (!cc) {
        setError(
          'Your profile must have a college before you can post announcements.',
        )
        return
      }
    }

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
      } else if (isCounselor) {
        const cc = resolveCollegeCodeFromUserData(
          user as unknown as Record<string, unknown>,
        ) as CollegeCode
        await announcementsService.createAnnouncement({
          title: t,
          content: c,
          publisherRole: 'counselor',
          visibility: 'students_one_college',
          collegeCodes: isCollegeCode(cc) ? [cc] : [],
          imageUrl: uploadedUrl ?? undefined,
          createdBy: user.id,
          createdByName: user.full_name || user.preferred_name || 'Counselor',
        })
      } else if (isAdmin) {
        await announcementsService.createAnnouncement({
          title: t,
          content: c,
          publisherRole: 'admin',
          visibility: targetRoleToVisibility(targetRole),
          imageUrl: uploadedUrl ?? undefined,
          createdBy: user.id,
          createdByName: user.full_name || user.preferred_name || 'Admin',
        })
      } else {
        setError('Only admins and counselors can post announcements.')
        return
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-form-title"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[90vh] overflow-hidden bg-aurora-bg border border-aurora-border sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-aurora-border">
          <h2 id="announcement-form-title" className="text-lg font-bold text-white font-heading">
            {isEdit ? 'Edit announcement' : 'New Announcement'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-aurora-text-sec" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder={isCounselor ? 'Enter announcement title' : 'e.g. Mental Health Week'}
              className={inputClass}
              required
            />
          </div>

          {isCounselor && !isEdit ? imageField : null}

          <div>
            <label className={labelClass}>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Write the announcement..."
              className={`${inputClass} resize-none`}
              required
            />
          </div>

          {isCounselor && !isEdit ? (
            <p className="text-[13px] text-aurora-text-sec leading-relaxed">
              Students and counselors in your college will see this on their dashboards.
              Admins can see all announcements.
            </p>
          ) : null}

          {isAdmin ? (
            <div>
              <label className={labelClass}>Visible to</label>
              <div className="grid grid-cols-3 gap-2">
                {ADMIN_ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setTargetRole(r.key)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                      targetRole === r.key
                        ? 'bg-aurora-blue/15 border-aurora-blue text-aurora-blue'
                        : 'bg-aurora-card border-aurora-border text-aurora-text-sec hover:text-white hover:border-white/20'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!isCounselor || isEdit ? imageField : null}

          {error && (
            <p className="text-xs font-semibold text-aurora-red bg-aurora-red/10 border border-aurora-red/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-aurora-border bg-aurora-card">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-aurora-text-sec hover:text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm font-bold text-white bg-aurora-blue hover:bg-aurora-blue/90 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
            )}
            {saving ? 'Publishing...' : isEdit ? 'Save changes' : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  )
}
