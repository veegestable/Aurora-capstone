import { useState, useEffect, useRef } from 'react'
import { X, Camera, User as UserIcon, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { LetterAvatar } from '../LetterAvatar'
import type { User } from '../../types/user.types'

type SexOption = 'male' | 'female'

interface EditCounselorProfileModalProps {
  onClose: () => void
  user: User | null
}

export function EditCounselorProfileModal({ onClose, user }: EditCounselorProfileModalProps) {
  const { updateUser, uploadAvatar } = useAuth()

  const [name, setName] = useState('')
  const [sex, setSex] = useState<SexOption | undefined>(undefined)
  const [counselorNumber, setCounselorNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setName(user.full_name || '')
      setSex(user.sex ?? undefined)
      setCounselorNumber(user.student_number || '')
    }
  }, [user])

  const handlePickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      await uploadAvatar(file)
    } catch {
      alert('Could not upload profile picture. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    const numTrim = counselorNumber.trim()

    if (!numTrim) {
      alert('Please enter your counselor number.')
      return
    }

    setSaving(true)
    try {
      await updateUser({
        full_name: name.trim() || user?.full_name || 'Counselor',
        sex,
        student_number: numTrim,
      })
      onClose()
    } catch {
      alert('Could not save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-aurora-lg w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-aurora-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-aurora-gray-500 hover:text-aurora-primary-dark transition-colors cursor-pointer"
            aria-label="Cancel"
          >
            <X className="w-4.5 h-4.5" />
            <span className="text-sm">Cancel</span>
          </button>
          <h2 className="text-lg font-bold text-aurora-primary-dark">Edit Profile</h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm font-bold text-aurora-secondary-blue hover:text-aurora-secondary-dark-blue
                       disabled:text-aurora-gray-400 transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-2">
            <div className="relative">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-[90px] h-[90px] rounded-full object-cover"
                />
              ) : (
                <LetterAvatar
                  name={name || user?.full_name || 'Counselor'}
                  size={90}
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePickAvatar}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-aurora-secondary-blue
                           flex items-center justify-center border-2 border-white
                           hover:bg-aurora-secondary-dark-blue transition-colors cursor-pointer
                           disabled:opacity-50"
                aria-label="Change profile picture"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            </div>
            <p className="text-xs text-aurora-gray-500 mt-2">MSU-IIT</p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-aurora-primary-dark mb-2">Full Name</label>
            <div className="flex items-center gap-2.5 border border-aurora-gray-200 rounded-xl px-3.5 bg-aurora-gray-50">
              <UserIcon className="w-4 h-4 text-aurora-gray-400 shrink-0" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="flex-1 py-3.5 text-[15px] text-aurora-primary-dark bg-transparent
                           placeholder:text-aurora-gray-400 outline-none"
              />
            </div>
          </div>

          {/* Sex */}
          <div>
            <label className="block text-sm font-semibold text-aurora-primary-dark mb-2">Sex</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSex('male')}
                className={`flex-1 py-3.5 rounded-xl border-2 text-[15px] font-semibold transition-colors cursor-pointer ${
                  sex === 'male'
                    ? 'border-aurora-secondary-blue bg-aurora-secondary-blue/10 text-aurora-primary-dark'
                    : 'border-aurora-gray-200 bg-aurora-gray-50 text-aurora-gray-500 hover:border-aurora-gray-300'
                }`}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => setSex('female')}
                className={`flex-1 py-3.5 rounded-xl border-2 text-[15px] font-semibold transition-colors cursor-pointer ${
                  sex === 'female'
                    ? 'border-aurora-secondary-blue bg-aurora-secondary-blue/10 text-aurora-primary-dark'
                    : 'border-aurora-gray-200 bg-aurora-gray-50 text-aurora-gray-500 hover:border-aurora-gray-300'
                }`}
              >
                Female
              </button>
            </div>
          </div>

          {/* Counselor Number */}
          <div>
            <label className="block text-sm font-semibold text-aurora-primary-dark mb-2">
              Counselor Number <span className="text-aurora-accent-red">*</span>
            </label>
            <input
              type="text"
              value={counselorNumber}
              onChange={(e) => setCounselorNumber(e.target.value)}
              placeholder="e.g. 2015-0482"
              className="w-full border border-aurora-gray-200 rounded-xl px-3.5 py-3.5 text-[15px]
                         text-aurora-primary-dark bg-aurora-gray-50 placeholder:text-aurora-gray-400 outline-none
                         focus:ring-2 focus:ring-aurora-secondary-blue/30 focus:border-aurora-secondary-blue"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-aurora w-full py-4 rounded-2xl text-lg font-extrabold disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}