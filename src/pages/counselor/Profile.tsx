import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Pencil, User as UserIcon, Bell, Shield, LogOut, ExternalLink,
} from 'lucide-react'
import { LetterAvatar } from '../../components/LetterAvatar'
import { SectionHeader } from '../../components/profile/SectionHeader'
import { InfoRow } from '../../components/profile/InfoRow'
import { SettingsRow } from '../../components/profile/SettingsRow'
import { ToggleRow } from '../../components/student/ToggleRow'
import { EditCounselorProfileModal } from '../../components/counselor/EditCounselorProfileModal'
import { useAuth } from '../../contexts/AuthContext'
import { userSettingsService } from '../../services/user-settings'

export default function CounselorProfile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [pushSaving, setPushSaving] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    userSettingsService
      .getUserSettings(user.id)
      .then((s) => {
        if (cancelled) return
        if (typeof s?.pushNotificationsEnabled === 'boolean') {
          setPushNotifications(s.pushNotificationsEnabled)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.id])

  const togglePushNotifications = async (next: boolean) => {
    if (!user?.id || pushSaving) return
    setPushNotifications(next)
    setPushSaving(true)
    try {
      await userSettingsService.updateUserSettings(user.id, {
        pushNotificationsEnabled: next,
      })
    } catch {
      setPushNotifications(!next)
      alert('Could not save preference. Please try again.')
    } finally {
      setPushSaving(false)
    }
  }

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
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <h2 className="text-xl sm:text-2xl font-bold text-white font-heading text-center">
        Profile &amp; Settings
      </h2>

      {/* Avatar & Name */}
      <div className="flex flex-col items-center pt-2 pb-1">
        <div className="relative mb-4">
          <div className="ring-[3px] ring-aurora-secondary-blue rounded-full">
            <LetterAvatar name={displayName} size={110} avatarUrl={user?.avatar_url ?? undefined} />
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
        <h3 className="text-[22px] font-extrabold text-white mb-1">{displayName}</h3>
        <p className="text-sm text-aurora-text-sec mb-1.5">{counselorId}</p>
        <p className="text-sm text-aurora-text-sec">Guidance Counselor</p>
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
            <InfoRow label="Contact Number" value={user?.contact_number || 'Not set'} />
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div>
        <SectionHeader title="ACCOUNT SETTINGS" />
        <div className="card-aurora p-0! overflow-hidden">
          <div className="px-5">
            <SettingsRow
              icon={<UserIcon className="w-[18px] h-[18px] text-aurora-blue" />}
              label="Edit Profile"
              onClick={() => setShowEditProfile(true)}
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
              icon={<Bell className="w-[18px] h-[18px] text-aurora-blue" />}
              label="Push Notifications"
              checked={pushNotifications}
              onChange={togglePushNotifications}
              disabled={pushSaving}
            />
          </div>
        </div>
      </div>

      {/* Privacy & Data */}
      <div>
        <SectionHeader title="PRIVACY & DATA" />
        <div className="card-aurora">
          <div className="flex items-start gap-3">
            <Shield className="w-[22px] h-[22px] text-aurora-secondary-blue mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[15px] font-bold text-white mb-2">
                Student Data Access
              </p>
              <p className="text-[13px] text-aurora-text-sec leading-relaxed mb-3.5">
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

      {showEditProfile && (
        <EditCounselorProfileModal
          onClose={() => setShowEditProfile(false)}
          user={user}
        />
      )}
    </div>
  )
}