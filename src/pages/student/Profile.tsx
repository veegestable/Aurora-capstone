import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Camera, Bell, LogOut, User, UtensilsCrossed,
  Sunrise, Droplets, ChevronRight, Shield,
} from 'lucide-react'
import { LetterAvatar } from '../../components/LetterAvatar'
import { SectionHeader } from '../../components/profile/SectionHeader'
import { InfoRow } from '../../components/profile/InfoRow'
import { SettingsRow } from '../../components/profile/SettingsRow'
import { ToggleRow } from '../../components/student/ToggleRow'
import { EditProfileModal } from '../../components/student/EditProfileModal'
import { SignOutConfirmModal } from '../../components/common/SignOutConfirmModal'
import { PrivacyNoticeBanner } from '../../components/privacy/PrivacyNoticeBanner'
import { useStudentPrivacy } from '../../contexts/StudentPrivacyContext'
import { resolveCollegeCodeFromUserData, getCollegeName, isCollegeCode } from '../../constants/colleges'
import { COLLEGES } from '../../constants/colleges'
import { getProgramsForCollege } from '../../constants/college-programs-iit'
import type { CollegeCode } from '../../constants/colleges'
import { userSettingsService } from '../../services/user-settings'
import { TimePickerModal } from '../../components/student/profile/TimePickerModal'
import { MealScheduleModal } from '../../components/student/profile/MealScheduleModal'
import { useUserDaySettings } from '../../contexts/UserDaySettingsContext'
import { formatYearLevelForDisplay, formatCounselorStudentSubtitle } from '../../constants/student/programs'

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
  const { openPrivacyAssurance } = useStudentPrivacy()

  const [showEditProfile, setShowEditProfile] = useState(false)
  const [mealOpen, setMealOpen] = useState(false)
  const [bathOpen, setBathOpen] = useState(false)
  const [wakeOpen, setWakeOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [collegeShiftOpen, setCollegeShiftOpen] = useState(false)
  const [shiftTargetCollege, setShiftTargetCollege] = useState<CollegeCode | ''>('')
  const [shiftTargetProgram, setShiftTargetProgram] = useState('')
  const [shiftReason, setShiftReason] = useState('')
  const [shiftSubmitting, setShiftSubmitting] = useState(false)
  const [shiftError, setShiftError] = useState('')
  const [shiftSuccess, setShiftSuccess] = useState('')

  const remindersEnabled = settings?.remindersEnabled ?? true
  const sessionUpdatesEnabled = settings?.sessionUpdatesEnabled ?? true
  const reminderHour = settings?.reminderHour ?? 7
  const reminderMinute = settings?.reminderMinute ?? 0
  const usualBathTime = settings?.usualBathTime || ''
  const usualWakeTime = settings?.usualWakeTime || ''

  const displayName = user?.preferred_name || user?.full_name || 'Student'
  const resolvedCollege = resolveCollegeCodeFromUserData(
    user as Record<string, unknown> | null,
  )
  const subtitle = formatCounselorStudentSubtitle({
    college_code: user?.college_code,
    department: user?.department,
    program: user?.program,
    year_level: user?.year_level,
  }) || 'MSU-IIT Student'

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

  const handleSubmitCollegeShift = async () => {
    if (!user?.id || !shiftTargetCollege) return
    setShiftError('')
    setShiftSuccess('')
    setShiftSubmitting(true)
    try {
      await userSettingsService.submitCollegeShiftRequest(
        user.id,
        shiftTargetCollege as CollegeCode,
        shiftTargetProgram,
        shiftReason,
      )
      setShiftSuccess('Request submitted! An admin will review your college change.')
      setCollegeShiftOpen(false)
    } catch (e) {
      setShiftError(e instanceof Error ? e.message : 'Could not submit request.')
    } finally {
      setShiftSubmitting(false)
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

      <PrivacyNoticeBanner className="mb-2" />

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
              icon={<Shield className="w-[18px] h-[18px] text-aurora-gray-500" />}
              label="Privacy & data"
              onClick={openPrivacyAssurance}
            />
            
            {resolvedCollege && !user?.college_shift_pending && (
              <SettingsRow
                icon={<ChevronRight className="w-[18px] h-[18px] text-aurora-gray-500" />}
                label="Request college / program change"
                onClick={() => {
                  setShiftTargetCollege('')
                  setShiftTargetProgram('')
                  setShiftReason('')
                  setShiftError('')
                  setShiftSuccess('')
                  setCollegeShiftOpen(true)
                }}
              />
            )}

            {user?.college_shift_pending && (
              <div className="py-3 border-t border-white/8">
                <p className="text-amber-400 text-[13px] font-bold mb-1">
                  College change pending review
                </p>
                <p className="text-aurora-text-sec text-xs leading-relaxed">
                  An administrator is reviewing your request. You will keep your
                  current college until it is approved.
                </p>
              </div>
            )}

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
            <InfoRow
              label="College"
              value={resolvedCollege ? `${resolvedCollege} — ${getCollegeName(resolvedCollege)}` : 'Not set'}
            />
            <InfoRow label="Program" value={user?.program || 'Not set'} />
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
              label="Daily reminders"
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

      {/* College Shift Request Modal */}
      {collegeShiftOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-5"
          style={{ backgroundColor: 'rgba(3,8,24,0.55)' }}
          onClick={() => { if (!shiftSubmitting) setCollegeShiftOpen(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Request college change"
        >
          <div
            className="w-full max-w-md bg-aurora-card border border-white/8 rounded-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold text-white">Request college / program change</h3>

            {shiftError && (
              <p className="text-sm text-aurora-red bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] rounded-xl px-3 py-2">
                {shiftError}
              </p>
            )}

            <div>
              <label htmlFor="shiftCollege" className="block text-xs font-semibold text-aurora-text-sec mb-1.5">
                New college <span className="text-red-400">*</span>
              </label>
              <select
                id="shiftCollege"
                value={shiftTargetCollege}
                onChange={(e) => {
                  setShiftTargetCollege(e.target.value as CollegeCode | '')
                  setShiftTargetProgram('')
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/8 bg-white/5 text-white text-sm outline-hidden
                           focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue"
                aria-label="Select new college"
              >
                <option value="" disabled className="bg-[#0B0D30] text-white">Select a college</option>
                {COLLEGES.map(c => (
                  <option key={c.code} value={c.code} className="bg-[#0B0D30] text-white">{c.code} — {c.name}</option>
                ))}
              </select>
            </div>

            {shiftTargetCollege && isCollegeCode(shiftTargetCollege) && (
              <div>
                <label htmlFor="shiftProgram" className="block text-xs font-semibold text-aurora-text-sec mb-1.5">
                  New program <span className="text-red-400">*</span>
                </label>
                <select
                  id="shiftProgram"
                  value={shiftTargetProgram}
                  onChange={(e) => setShiftTargetProgram(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/8 bg-white/5 text-white text-sm outline-hidden
                             focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue"
                  aria-label="Select new program"
                >
                  <option value="" disabled className="bg-[#0B0D30] text-white">Select a program</option>
                  {getProgramsForCollege(shiftTargetCollege).map(label => (
                    <option key={label} value={label} className="bg-[#0B0D30] text-white">{label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="shiftReason" className="block text-xs font-semibold text-aurora-text-sec mb-1.5">
                Reason <span className="text-red-400">*</span> (at least 8 characters)
              </label>
              <textarea
                id="shiftReason"
                value={shiftReason}
                onChange={(e) => setShiftReason(e.target.value)}
                rows={3}
                placeholder="Briefly explain why you need this change…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/8 bg-white/5 text-white text-sm outline-hidden resize-none
                           placeholder:text-aurora-text-muted
                           focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue"
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setCollegeShiftOpen(false)}
                disabled={shiftSubmitting}
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-white
                           bg-white/5 border border-white/8
                           hover:bg-white/10 transition-colors cursor-pointer
                           disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCollegeShift}
                disabled={shiftSubmitting || !shiftTargetCollege || !shiftReason.trim()}
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-white
                           bg-aurora-blue hover:bg-aurora-blue/80 transition-colors cursor-pointer
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shiftSubmitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {shiftSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-110 max-w-sm px-4 py-3 rounded-xl
                        bg-aurora-green/20 border border-aurora-green/40 text-aurora-green text-sm font-semibold text-center
                        animate-fade-in">
          {shiftSuccess}
        </div>
      )}
    </div>
  )
}