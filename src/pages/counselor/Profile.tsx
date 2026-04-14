import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Pencil, Lock, User as UserIcon, Bell, Moon,
  Shield, LogOut, ExternalLink,
} from 'lucide-react'
import { LetterAvatar } from '../../components/LetterAvatar'
import { SectionHeader } from '../../components/profile/SectionHeader'
import { InfoRow } from '../../components/profile/InfoRow'
import { ProfileStatCard } from '../../components/counselor/ProfileStatCard'
import { SettingsRow } from '../../components/counselor/SettingsRow'
import { EditCounselorProfileModal } from '../../components/counselor/EditCounselorProfileModal'
import { counselorService } from '../../services/counselor'

export default function CounselorProfile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [studentCount, setStudentCount] = useState('0')
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0)

  useEffect(() => {
    counselorService.getStudents()
      .then(students => setStudentCount(String(students.length)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user?.id) return
    counselorService.getSessionHistory(user.id)
      .then(sessions => {
        const completed = sessions.filter(s => s.status === 'completed').length
        setCompletedSessionsCount(completed)
      })
      .catch(() => {})
  }, [user?.id])

  const handleSignOut = async () => {
    if (!window.confirm('Are you sure you want to sign out?')) return
    try {
      await signOut()
      navigate('/')
    } catch { /* silent */ }
  }

  const displayName = user?.full_name || 'Counselor'
  const counselorId = user?.student_number ? `MSU-IIT ID: ${user.student_number}` : 'MSU-IIT'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark font-heading text-center">
        Profile &amp; Settings
      </h2>

      {/* Avatar & Name */}
      <div className="flex flex-col items-center pt-2 pb-1">
        <div className="relative mb-4">
          <div className="ring-[3px] ring-aurora-secondary-blue rounded-full">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                className="w-[110px] h-[110px] rounded-full object-cover"
              />
            ) : (
              <LetterAvatar name={displayName} size={110} />
            )}
          </div>
          <button
            onClick={() => setShowEditProfile(true)}
            className="absolute bottom-0.5 right-0.5 w-8 h-8 rounded-full bg-aurora-secondary-blue
                       flex items-center justify-center border-[2.5px] border-[#0B0D30] cursor-pointer
                       hover:bg-aurora-secondary-dark-blue transition-colors"
            aria-label="Edit profile"
          >
            <Pencil className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <h3 className="text-[22px] font-extrabold text-aurora-primary-dark mb-1">{displayName}</h3>
        <p className="text-sm text-aurora-gray-500 mb-1.5">{counselorId}</p>
        <p className="text-sm text-aurora-gray-500">Guidance Counselor</p>
      </div>

      {/* Stats Row */}
      <div className="flex gap-2">
        <ProfileStatCard
          label="STUDENTS"
          value={studentCount}
          sub="+5%"
          subColorClass="text-aurora-accent-green"
        />
        <ProfileStatCard
          label="SESSIONS"
          value={String(completedSessionsCount)}
          sub="Completed"
          subColorClass="text-aurora-accent-green"
        />
      </div>

      {/* Personal Details */}
      <div>
        <SectionHeader title="PERSONAL DETAILS" />
        <div className="card-aurora p-0! overflow-hidden">
          <div className="px-5">
            <InfoRow label="Full Name" value={user?.full_name || 'Counselor'} />
            <InfoRow
              label="Sex"
              value={user?.sex ? (user.sex === 'male' ? 'Male' : 'Female') : 'Not set'}
            />
            <InfoRow label="Counselor Number" value={user?.student_number || 'Not set'} />
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div>
        <SectionHeader title="ACCOUNT SETTINGS" />
        <div className="card-aurora p-0! overflow-hidden">
          <SettingsRow
            icon={<Lock className="w-[18px] h-[18px] text-aurora-gray-500" />}
            label="Security & Password"
            onPress={() => {}}
          />
          <SettingsRow
            icon={<UserIcon className="w-[18px] h-[18px] text-aurora-gray-500" />}
            label="Edit Profile"
            onPress={() => setShowEditProfile(true)}
          />
        </div>
      </div>

      {/* App Preferences */}
      <div>
        <SectionHeader title="APP PREFERENCES" />
        <div className="card-aurora p-0! overflow-hidden">
          <SettingsRow
            icon={<Bell className="w-[18px] h-[18px] text-aurora-gray-500" />}
            label="Push Notifications"
            rightElement={
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushNotifications}
                  onChange={(e) => setPushNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className="w-11 h-6 rounded-full transition-colors
                             bg-aurora-gray-300 peer-checked:bg-aurora-secondary-blue
                             after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                             after:bg-white after:rounded-full after:h-5 after:w-5
                             after:transition-transform peer-checked:after:translate-x-full"
                />
              </label>
            }
          />
          <SettingsRow
            icon={<Moon className="w-[18px] h-[18px] text-aurora-gray-500" />}
            label="Dark Mode"
            rightElement={
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className="w-11 h-6 rounded-full transition-colors
                             bg-aurora-gray-300 peer-checked:bg-aurora-secondary-blue
                             after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                             after:bg-white after:rounded-full after:h-5 after:w-5
                             after:transition-transform peer-checked:after:translate-x-full"
                />
              </label>
            }
          />
        </div>
      </div>

      {/* Privacy & Data */}
      <div>
        <SectionHeader title="PRIVACY & DATA" />
        <div className="card-aurora">
          <div className="flex items-start gap-3">
            <Shield className="w-[22px] h-[22px] text-aurora-secondary-blue mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[15px] font-bold text-aurora-primary-dark mb-2">
                Student Data Access
              </p>
              <p className="text-[13px] text-aurora-gray-500 leading-relaxed mb-3.5">
                Your access to student data is governed by the MSU-IIT Privacy Policy. You can view
                academic records and wellness logs only for assigned students. All session notes are
                encrypted and stored securely.
              </p>
              <button className="flex items-center gap-1.5 cursor-pointer group">
                <span className="text-[13px] font-bold tracking-wide text-aurora-secondary-blue group-hover:underline">
                  READ FULL POLICY
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-aurora-secondary-blue" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full py-4.5 rounded-2xl font-bold text-[17px] text-white
                   bg-aurora-secondary-blue shadow-aurora
                   hover:bg-aurora-secondary-dark-blue transition-colors cursor-pointer
                   flex items-center justify-center gap-2.5"
        aria-label="Sign out"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditCounselorProfileModal
          onClose={() => setShowEditProfile(false)}
          user={user}
        />
      )}
    </div>
  )
}