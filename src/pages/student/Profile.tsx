import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Camera, Lock, Eye, Bell, Video, LogOut } from 'lucide-react'
import { LetterAvatar } from '../../components/LetterAvatar'
import { SectionHeader } from '../../components/profile/SectionHeader'
import { InfoRow } from '../../components/profile/InfoRow'
import { PrivacyRow } from '../../components/student/PrivacyRow'
import { ToggleRow } from '../../components/student/ToggleRow'
import { EditProfileModal } from '../../components/student/EditProfileModal'

export default function StudentProfile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [dailyReminders, setDailyReminders] = useState(true)
  const [aiCamera, setAiCamera] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)

  const handleSignOut = async () => {
    if (!window.confirm('Are you sure you want to sign out?')) return
    try {
      await signOut()
      navigate('/')
    } catch { /* silent */ }
  }

  const displayName = user?.preferred_name || user?.full_name || 'Student'
  const subtitle = user?.department
    ? `${user.department}${user.year_level ? ` • ${user.year_level} Year` : ''}`
    : 'MSU-IIT CCS Student'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark font-heading text-center">
        Settings
      </h2>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center">
        <div className="relative mb-3">
          <div className="ring-[3px] ring-aurora-secondary-blue rounded-full">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <LetterAvatar name={displayName} size={80} />
            )}
          </div>
          <button
            onClick={() => setShowEditProfile(true)}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-aurora-secondary-blue
                       flex items-center justify-center border-2 border-white cursor-pointer
                       hover:bg-aurora-secondary-dark-blue transition-colors"
            aria-label="Edit profile"
          >
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <h3 className="text-xl font-extrabold text-aurora-primary-dark">{displayName}</h3>
        <p className="text-sm text-aurora-gray-500 mt-0.5">{subtitle}</p>
      </div>

      {/* Personal Details */}
      <div>
        <SectionHeader title="PERSONAL DETAILS" />
        <div className="card-aurora p-0! overflow-hidden">
          <div className="px-5">
            <InfoRow label="Full Name" value={user?.full_name || 'Student'} />
            <InfoRow
              label="Sex"
              value={user?.sex ? (user.sex === 'male' ? 'Male' : 'Female') : 'Not set'}
            />
            <InfoRow
              label="Program & Year"
              value={
                user?.department && user?.year_level
                  ? `${user.department} - ${user.year_level}`
                  : 'Not set'
              }
            />
            <InfoRow label="Student Number" value={user?.student_number || 'Not set'} />
          </div>
        </div>
      </div>

      {/* Privacy Transparency */}
      <div>
        <SectionHeader
          icon={<Lock className="w-3.5 h-3.5 text-aurora-secondary-blue" />}
          title="PRIVACY TRANSPARENCY"
        />
        <div className="card-aurora p-0! overflow-hidden">
          <div className="px-5">
            <PrivacyRow
              icon={<Eye className="w-[18px] h-[18px] text-aurora-accent-green" />}
              title="What counselors see"
              description="Aggregated mood trends, crisis alerts, and your scheduled appointments."
            />
            <PrivacyRow
              icon={<Lock className="w-[18px] h-[18px] text-aurora-secondary-blue" />}
              title="What stays private"
              description="Specific journal entries, AI-analyzed facial micro-expressions, and chat logs."
            />
          </div>
        </div>
      </div>

      {/* App Preferences */}
      <div>
        <SectionHeader title="APP PREFERENCES" />
        <div className="card-aurora p-0! overflow-hidden">
          <div className="px-5">
            <ToggleRow
              icon={<Bell className="w-[18px] h-[18px] text-aurora-gray-500" />}
              label="Daily Check-in Reminders"
              checked={dailyReminders}
              onChange={setDailyReminders}
            />
            <ToggleRow
              icon={<Video className="w-[18px] h-[18px] text-aurora-gray-500" />}
              label="AI Camera Permissions"
              checked={aiCamera}
              onChange={setAiCamera}
            />
          </div>
        </div>
      </div>

      {/* Edit Profile Button */}
      <button
        onClick={() => setShowEditProfile(true)}
        className="w-full py-4 rounded-2xl text-[15px] font-bold text-aurora-secondary-blue
                   bg-aurora-secondary-blue/10 border border-aurora-secondary-blue/30
                   hover:bg-aurora-secondary-blue/20 transition-colors cursor-pointer"
      >
        Edit Profile
      </button>

      {/* Logout */}
      <button
        onClick={handleSignOut}
        className="w-full py-4 rounded-2xl text-[15px] font-bold text-aurora-accent-red
                   bg-red-50 border border-red-200
                   hover:bg-red-100 transition-colors cursor-pointer
                   flex items-center justify-center gap-2"
        aria-label="Sign out"
      >
        <LogOut className="w-[18px] h-[18px]" />
        Logout Account
      </button>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal
          onClose={() => setShowEditProfile(false)}
          user={user}
        />
      )}
    </div>
  )
}