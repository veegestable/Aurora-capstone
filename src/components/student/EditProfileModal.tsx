import { useState, useEffect, useRef } from 'react'
import { X, Camera, User as UserIcon, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { LetterAvatar } from '../LetterAvatar'
import { CCS_COLLEGE_DEPARTMENT } from '../../constants/student/programs'
import { resolveCollegeCodeFromUserData, getCollegeName } from '../../constants/colleges'
import type { User } from '../../types/user.types'

type SexOption = 'male' | 'female'

interface EditProfileModalProps {
  onClose: () => void
  user: User | null
}

export function EditProfileModal({ onClose, user }: EditProfileModalProps) {
  const { updateUser, uploadAvatar } = useAuth()

  const [name, setName] = useState('')
  const [sex, setSex] = useState<SexOption | undefined>(undefined)
  const [yearLevel, setYearLevel] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resolvedCollege = resolveCollegeCodeFromUserData(user as Record<string, unknown> | null)

  useEffect(() => {
    if (!user) return
    setName(user.preferred_name || user.full_name || '')
    setSex(user.sex ?? undefined)
    setYearLevel(user.year_level || '')
    setStudentNumber(user.student_number || '')
    setContactNumber(user.contact_number || '')
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
    const yearTrim = yearLevel.trim()
    const studentNumTrim = studentNumber.trim()
    const contactTrim = contactNumber.trim()

    if (!yearTrim) { alert('Please enter your year level (e.g. 1st Year, 2nd Year).'); return }
    if (!studentNumTrim) { alert('Please enter your student number.'); return }
    if (!contactTrim) { alert('Please enter your contact number.'); return }
    if (contactTrim.length < 7) { alert('Contact number should be at least 7 digits.'); return }

    setSaving(true)
    try {
      await updateUser({
        preferred_name: name.trim() || user?.full_name || 'Student',
        sex,
        ...(resolvedCollege ? { college_code: resolvedCollege } : { department: CCS_COLLEGE_DEPARTMENT }),
        year_level: yearTrim,
        student_number: studentNumTrim,
        contact_number: contactTrim,
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
      <div className="bg-aurora-card rounded-2xl shadow-aurora-lg w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-aurora-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-aurora-border shrink-0">
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
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <LetterAvatar
                name={user?.preferred_name || user?.full_name || 'Student'}
                size={90}
                avatarUrl={user?.avatar_url ?? undefined}
              />
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
                           flex items-center justify-center border-2 border-aurora-bg-deep
                           hover:bg-aurora-secondary-dark-blue transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Change profile picture"
              >
                {uploadingAvatar
                  ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  : <Camera className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
            <p className="text-xs text-aurora-gray-500 mt-2">
              {resolvedCollege ? `${getCollegeName(resolvedCollege)} • MSU-IIT` : 'MSU-IIT'}
            </p>
            {user?.program ? (
              <p className="text-xs text-aurora-gray-500 mt-1 text-center max-w-sm">
                {user.program}
              </p>
            ) : null}
            <p className="text-xs text-aurora-gray-400 mt-1 text-center max-w-sm">
              To change college or program, use Request college change on your profile.
            </p>
          </div>

          {/* Name */}
          <FieldLabel label="Name" />
          <div className="flex items-center gap-2.5 border border-aurora-border rounded-xl px-3.5 bg-aurora-card-alt">
            <UserIcon className="w-4 h-4 text-aurora-gray-500 shrink-0" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="flex-1 py-3.5 text-[15px] text-aurora-primary-dark bg-transparent placeholder:text-aurora-gray-400 outline-none"
            />
          </div>

          {/* Year Level */}
          <FieldLabel label="Year Level" required />
          <input
            type="text"
            value={yearLevel}
            onChange={(e) => setYearLevel(e.target.value)}
            placeholder="e.g. 1st Year, 2nd Year"
            className="w-full border border-aurora-border rounded-xl px-3.5 py-3.5 text-[15px]
                       text-aurora-primary-dark bg-aurora-card-alt placeholder:text-aurora-gray-400 outline-none
                       focus:ring-2 focus:ring-aurora-secondary-blue/30 focus:border-aurora-secondary-blue"
          />

          {/* Student Number */}
          <FieldLabel label="Student Number" required />
          <input
            type="text"
            value={studentNumber}
            onChange={(e) => setStudentNumber(e.target.value)}
            placeholder="e.g. 2021-0001"
            className="w-full border border-aurora-border rounded-xl px-3.5 py-3.5 text-[15px]
                       text-aurora-primary-dark bg-aurora-card-alt placeholder:text-aurora-gray-400 outline-none
                       focus:ring-2 focus:ring-aurora-secondary-blue/30 focus:border-aurora-secondary-blue"
          />

          {/* Contact Number */}
          <FieldLabel label="Contact number" required />
          <input
            type="tel"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="Mobile phone (e.g. 09XXXXXXXXX)"
            className="w-full border border-aurora-border rounded-xl px-3.5 py-3.5 text-[15px]
                       text-aurora-primary-dark bg-aurora-card-alt placeholder:text-aurora-gray-400 outline-none
                       focus:ring-2 focus:ring-aurora-secondary-blue/30 focus:border-aurora-secondary-blue"
          />

          {/* Sex */}
          <FieldLabel label="Sex" />
          <div className="flex gap-3">
            {(['male', 'female'] as const).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setSex(opt)}
                className={`flex-1 py-3.5 rounded-xl border-2 text-[15px] font-semibold transition-colors cursor-pointer capitalize ${
                  sex === opt
                    ? 'border-aurora-secondary-blue bg-aurora-secondary-blue/15 text-aurora-primary-dark'
                    : 'border-aurora-border bg-aurora-card-alt text-aurora-gray-500 hover:text-aurora-primary-dark'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-aurora w-full py-4 rounded-2xl text-lg font-extrabold disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-aurora-primary-dark">
      {label} {required ? <span className="text-aurora-accent-red">*</span> : null}
    </label>
  )
}
