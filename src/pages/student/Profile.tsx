import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Camera, Lock, Eye, Bell, LogOut, User, UtensilsCrossed,
  Sunrise, Droplets, ChevronRight,
} from 'lucide-react'
import { LetterAvatar } from '../../components/LetterAvatar'
import { SectionHeader } from '../../components/profile/SectionHeader'
import { InfoRow } from '../../components/profile/InfoRow'
import { SettingsRow } from '../../components/profile/SettingsRow'
import { PrivacyRow } from '../../components/student/PrivacyRow'
import { ToggleRow } from '../../components/student/ToggleRow'
import { EditProfileModal } from '../../components/student/EditProfileModal'
import { SignOutConfirmModal } from '../../components/common/SignOutConfirmModal'
import { TimePickerModal } from '../../components/student/profile/TimePickerModal'
import { MealScheduleModal } from '../../components/student/profile/MealScheduleModal'
import { useUserDaySettings } from '../../contexts/UserDaySettingsContext'
import {
  CCS_COLLEGE_DEPARTMENT,
  formatYearLevelForDisplay,
  formatCounselorStudentSubtitle,
} from '../../constants/student/programs'

const COUNSELOR_VISIBLE_CHECKIN_SUMMARY =
  'Counselors can see each check-in’s date, time, and mood label from recent history. Notes, sleep, meals, bath, and photos are not shown unless you are in that counselor’s special population (session request or accepting their proposed time).'

function toFriendlyTime(hhmm?: string): string {
  if (!hhmm) return ''
  const [hRaw, mRaw] = hhmm.split(':')
  const h = Number(hRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function reminderHHmm(hour: number, minute: number): string {
  const h = Math.max(0, Math.min(23, hour))
  const m = Math.max(0, Math.min(59, minute))
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function StudentProfile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { settings, updateSettings } = useUserDaySettings()

  const [showEditProfile, setShowEditProfile] = useState(false)
  const [mealOpen, setMealOpen] = useState(false)
  const [bathOpen, setBathOpen] = useState(false)
  const [wakeOpen, setWakeOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [expandedPrivacyRow, setExpandedPrivacyRow] = useState<'visible' | 'private' | null>('visible')
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const remindersEnabled = settings?.remindersEnabled ?? true
  const sessionUpdatesEnabled = settings?.sessionUpdatesEnabled ?? true
  const reminderHour = settings?.reminderHour ?? 7
  const reminderMinute = settings?.reminderMinute ?? 0
  const usualBathTime = settings?.usualBathTime || ''
  const usualWakeTime = settings?.usualWakeTime || ''

  const displayName = user?.preferred_name || user?.full_name || 'Student'
  const subtitle = formatCounselorStudentSubtitle({
    department: user?.department,
    program: user?.program,
    year_level: user?.year_level,
  }) || 'MSU-IIT CCS Student'

  const profileCompletion = useMemo(() => {
    let score = 0
    if (user?.preferred_name || user?.full_name) score += 20
    if (user?.sex) score += 15
    if (user?.program) score += 20
    if (user?.year_level) score += 20
    if (user?.student_number) score += 15
    if (user?.contact_number?.trim()) score += 5
    if (user?.avatar_url) score += 5
    return Math.min(score, 100)
  }, [
    user?.preferred_name,
    user?.full_name,
    user?.sex,
    user?.program,
    user?.year_level,
    user?.student_number,
    user?.contact_number,
    user?.avatar_url,
  ])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      navigate('/')
    } catch {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark font-heading text-center">
        Settings
      </h2>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center">
        <div className="relative mb-3">
          <div className="ring-[3px] ring-aurora-secondary-blue rounded-full">
            <LetterAvatar name={displayName} size={80} avatarUrl={user?.avatar_url ?? undefined} />
          </div>
          <button
            onClick={() => setShowEditProfile(true)}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-aurora-secondary-blue
                       flex items-center justify-center border-2 border-aurora-bg-deep cursor-pointer
                       hover:bg-aurora-secondary-dark-blue transition-colors"
            aria-label="Edit profile"
          >
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <h3 className="text-xl font-extrabold text-aurora-primary-dark">{displayName}</h3>
        <p className="text-sm text-aurora-gray-500 mt-0.5">{subtitle}</p>
        <p className="text-xs text-aurora-gray-400 mt-1">Profile {profileCompletion}% complete</p>
      </div>

      {/* Account Settings */}
      <div>
        <SectionHeader title="ACCOUNT SETTINGS" />
        <div className="card-aurora p-0! overflow-hidden">
          <div className="px-5">
            <SettingsRow
              icon={<User className="w-[18px] h-[18px] text-aurora-gray-500" />}
              label="Edit Profile"
              onClick={() => setShowEditProfile(true)}
            />
            <SettingsRow
              icon={<UtensilsCrossed className="w-[18px] h-[18px] text-aurora-gray-500" />}
              label="Meal Schedule"
              onClick={() => setMealOpen(true)}
            />
            <SettingsRow
              icon={<Droplets className="w-[18px] h-[18px] text-aurora-gray-500" />}
              label="Bath schedule"
              onClick={() => setBathOpen(true)}
              rightElement={
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${usualBathTime ? 'text-aurora-secondary-blue' : 'text-aurora-gray-400'}`}>
                    {usualBathTime ? toFriendlyTime(usualBathTime) : 'Set'}
                  </span>
                  <ChevronRight className="w-[18px] h-[18px] text-aurora-gray-400" />
                </div>
              }
            />
            <SettingsRow
              icon={<Sunrise className="w-[18px] h-[18px] text-aurora-gray-500" />}
              label="Wake-up schedule"
              onClick={() => setWakeOpen(true)}
              rightElement={
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${usualWakeTime ? 'text-aurora-secondary-blue' : 'text-aurora-gray-400'}`}>
                    {usualWakeTime ? toFriendlyTime(usualWakeTime) : 'Set'}
                  </span>
                  <ChevronRight className="w-[18px] h-[18px] text-aurora-gray-400" />
                </div>
              }
            />
          </div>
        </div>
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
            <InfoRow label="Department" value={CCS_COLLEGE_DEPARTMENT} />
            <InfoRow
              label="Program"
              value={
                user?.program ||
                (user?.department && user.department !== CCS_COLLEGE_DEPARTMENT
                  ? user.department
                  : '') ||
                'Not set'
              }
            />
            <InfoRow
              label="Year level"
              value={user?.year_level ? formatYearLevelForDisplay(user.year_level) : 'Not set'}
            />
            <InfoRow label="Student Number" value={user?.student_number || 'Not set'} />
            <InfoRow label="Contact number" value={user?.contact_number || 'Not set'} />
            <p className="text-[11px] text-aurora-gray-400 leading-relaxed pt-2 pb-3">
              Student number is used for school identity verification. Contact number is for
              scheduling and urgent reach-out only.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Transparency */}
      <div>
        <SectionHeader
          icon={<Lock className="w-3.5 h-3.5 text-aurora-secondary-blue" />}
          title="PRIVACY TRANSPARENCY"
        />
        <p className="text-xs text-aurora-gray-400 leading-relaxed mb-2">
          How guidance can use your check-ins in Aurora (no toggle — policy is fixed for now).
        </p>
        <div className="card-aurora p-0! overflow-hidden">
          <div className="px-5">
            <PrivacyRow
              icon={<Eye className="w-[18px] h-[18px] text-aurora-accent-green" />}
              title="What counselors can see"
              preview="Date, time, and mood for recent check-ins; directory info for scheduling."
              expanded={expandedPrivacyRow === 'visible'}
              onToggle={() => setExpandedPrivacyRow(prev => prev === 'visible' ? null : 'visible')}
              description={`${COUNSELOR_VISIBLE_CHECKIN_SUMMARY} Stress/energy trend tiles unlock for a counselor only when you are in their special population (you requested a session with them, or you accepted a session time they proposed). That is self-report data, not a diagnosis.`}
            />
            <PrivacyRow
              icon={<Lock className="w-[18px] h-[18px] text-aurora-secondary-blue" />}
              title="What stays narrower until special population"
              preview="Notes, sleep, meals, bath, and photos stay off counselor views until then."
              expanded={expandedPrivacyRow === 'private'}
              onToggle={() => setExpandedPrivacyRow(prev => prev === 'private' ? null : 'private')}
              description="After special-population consent for that counselor, they can see the same journal detail you see in Aurora for support. There is no in-app switch to revoke that yet."
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
              label="Session updates"
              statusBadge={sessionUpdatesEnabled ? 'ON' : 'OFF'}
              checked={sessionUpdatesEnabled}
              onChange={(v) => { void updateSettings({ sessionUpdatesEnabled: v }) }}
            />
            <ToggleRow
              icon={<Bell className="w-[18px] h-[18px] text-aurora-gray-500" />}
              label="Daily Check-in Reminders"
              checked={remindersEnabled}
              onChange={(v) => { void updateSettings({ remindersEnabled: v }) }}
            />
            <SettingsRow
              icon={<Bell className="w-[18px] h-[18px] text-aurora-gray-500" />}
              label="Reminder time"
              onClick={() => setReminderOpen(true)}
              rightElement={
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-aurora-secondary-blue">
                    {toFriendlyTime(reminderHHmm(reminderHour, reminderMinute))}
                  </span>
                  <ChevronRight className="w-[18px] h-[18px] text-aurora-gray-400" />
                </div>
              }
            />
            <p className="text-[11px] text-aurora-gray-400 leading-relaxed pt-2 pb-1">
              We will remind you to start your day at this time (default 7:00 AM).
            </p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => setShowSignOutModal(true)}
        className="w-full py-4 rounded-2xl text-[15px] font-bold text-aurora-accent-red
                   bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]
                   hover:bg-[rgba(239,68,68,0.16)] transition-colors cursor-pointer
                   flex items-center justify-center gap-2"
        aria-label="Sign out"
      >
        <LogOut className="w-[18px] h-[18px]" />
        Logout Account
      </button>
      <p className="text-[11px] text-aurora-gray-400 text-center -mt-3">
        You can sign back in anytime.
      </p>

      {/* Modals */}
      {showEditProfile && (
        <EditProfileModal onClose={() => setShowEditProfile(false)} user={user} />
      )}

      <MealScheduleModal
        open={mealOpen}
        initial={settings?.mealSchedule}
        onClose={() => setMealOpen(false)}
        onSave={async (next) => { await updateSettings({ mealSchedule: next }) }}
      />

      <TimePickerModal
        open={bathOpen}
        title="Bath schedule"
        description="Your usual bath time helps Aurora prompt bath check-ins around when you normally take one."
        initialValue={usualBathTime}
        defaultValue="19:00"
        onClose={() => setBathOpen(false)}
        onSave={async (hhmm) => { await updateSettings({ usualBathTime: hhmm }) }}
        onClear={async () => { await updateSettings({ usualBathTime: '' }) }}
      />

      <TimePickerModal
        open={wakeOpen}
        title="Wake-up schedule"
        description="Your usual wake time helps Aurora ask sleep and routine questions at sensible moments (similar to meal times)."
        initialValue={usualWakeTime}
        defaultValue="07:00"
        onClose={() => setWakeOpen(false)}
        onSave={async (hhmm) => { await updateSettings({ usualWakeTime: hhmm }) }}
        onClear={async () => { await updateSettings({ usualWakeTime: '' }) }}
      />

      <TimePickerModal
        open={reminderOpen}
        title="Reminder time"
        description="When should Aurora gently remind you to check in for the day?"
        initialValue={reminderHHmm(reminderHour, reminderMinute)}
        defaultValue="07:00"
        showClear={false}
        onClose={() => setReminderOpen(false)}
        onSave={async (hhmm) => {
          const [hRaw, mRaw] = hhmm.split(':')
          const h = Number(hRaw)
          const m = Number(mRaw)
          await updateSettings({
            reminderHour: Number.isFinite(h) ? h : 7,
            reminderMinute: Number.isFinite(m) ? m : 0,
          })
        }}
      />

      <SignOutConfirmModal
        visible={showSignOutModal}
        onStay={() => setShowSignOutModal(false)}
        onLeave={handleSignOut}
        leaving={isSigningOut}
      />
    </div>
  )
}