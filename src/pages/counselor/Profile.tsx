import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Pencil, User as UserIcon, Bell, Shield, LogOut, ExternalLink, GraduationCap,
} from 'lucide-react'
import { LetterAvatar } from '../../components/LetterAvatar'
import { SectionHeader } from '../../components/profile/SectionHeader'
import { InfoRow } from '../../components/profile/InfoRow'
import { SettingsRow } from '../../components/profile/SettingsRow'
import { ToggleRow } from '../../components/student/ToggleRow'
import { EditCounselorProfileModal } from '../../components/counselor/EditCounselorProfileModal'
import { useAuth } from '../../contexts/AuthContext'
import { SignOutConfirmModal } from '../../components/common/SignOutConfirmModal'
import {
  COLLEGES,
  type CollegeCode,
  resolveCollegeCodeFromUserData,
  getCollegeName,
  isCollegeCode,
} from '../../constants/colleges'
import { userSettingsService } from '../../services/user-settings'
import { MSUIIT_PRIVACY_POLICY_URL } from '../../constants/student-privacy'

export default function CounselorProfile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [pushSaving, setPushSaving] = useState(false)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [collegeShiftOpen, setCollegeShiftOpen] = useState(false)
  const [shiftTargetCollege, setShiftTargetCollege] = useState<CollegeCode | ''>('')
  const [shiftReason, setShiftReason] = useState('')
  const [shiftSubmitting, setShiftSubmitting] = useState(false)
  const [shiftError, setShiftError] = useState<string | null>(null)

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
    setIsSigningOut(true)
    try {
      await signOut()
      navigate('/')
    } catch { 
      setIsSigningOut(false)
    }
  }

  const displayName = user?.full_name || 'Counselor'
  const resolvedCollege = resolveCollegeCodeFromUserData(
    user as Record<string, unknown> | null,
  )

  const handleSubmitCollegeShift = async () => {
    if (!user?.id || !shiftTargetCollege || !isCollegeCode(shiftTargetCollege)) return
    if (shiftReason.trim().length < 8) {
      setShiftError('Please explain your college change (at least 8 characters).')
      return
    }
    setShiftSubmitting(true)
    setShiftError(null)
    try {
      await userSettingsService.submitCollegeShiftRequest(
        user.id,
        shiftTargetCollege,
        '',
        shiftReason,
      )
      setCollegeShiftOpen(false)
      setShiftReason('')
      setShiftTargetCollege('')
      alert('Your request is pending admin review.')
      window.location.reload()
    } catch (e) {
      setShiftError(e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setShiftSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

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
        {/* <p className="text-sm text-aurora-text-sec mb-1.5">{counselorId}</p> */}
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
            <InfoRow
              label="College"
              value={resolvedCollege ? `${resolvedCollege} — ${getCollegeName(resolvedCollege)}` : 'Not set'}
            />
            <InfoRow label="Contact number" value={user?.contact_number || 'Not set'} />
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
            {resolvedCollege && !user?.college_shift_pending ? (
              <SettingsRow
                icon={<GraduationCap className="w-[18px] h-[18px] text-aurora-blue" />}
                label="Request college change"
                onClick={() => {
                  setShiftTargetCollege('')
                  setShiftReason('')
                  setShiftError(null)
                  setCollegeShiftOpen(true)
                }}
              />
            ) : null}
            {user?.college_shift_pending ? (
              <div className="px-5 py-4 border-t border-aurora-border">
                <p className="text-sm font-bold text-amber-400 mb-1">
                  College change pending review
                </p>
                <p className="text-xs text-aurora-text-sec leading-relaxed">
                  An administrator is reviewing your request. You will keep your current college
                  until it is approved.
                </p>
              </div>
            ) : null}
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
              <a
                href={MSUIIT_PRIVACY_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 group"
              >
                <span className="text-[13px] font-bold tracking-wide text-aurora-secondary-blue group-hover:underline">
                  READ FULL POLICY
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-aurora-secondary-blue" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={() => setShowSignOutModal(true)}
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

      <SignOutConfirmModal
        visible={showSignOutModal}
        onStay={() => setShowSignOutModal(false)}
        onLeave={handleSignOut}
        leaving={isSigningOut}
      />

      {collegeShiftOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm"
          onClick={() => { if (!shiftSubmitting) setCollegeShiftOpen(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Request college change"
        >
          <div
            className="w-full max-w-md card-aurora border border-aurora-border p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold text-white">Request college change</h3>
            {shiftError && (
              <p className="text-sm text-aurora-red bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                {shiftError}
              </p>
            )}
            <div>
              <label htmlFor="counselorShiftCollege" className="block text-xs font-semibold text-aurora-text-sec mb-1.5">
                New college <span className="text-red-400">*</span>
              </label>
              <select
                id="counselorShiftCollege"
                value={shiftTargetCollege}
                onChange={(e) => setShiftTargetCollege(e.target.value as CollegeCode | '')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-aurora-border bg-aurora-card-alt text-white text-sm outline-none
                           focus:ring-2 focus:ring-aurora-blue/30"
              >
                <option value="" disabled>Select a college</option>
                {COLLEGES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="counselorShiftReason" className="block text-xs font-semibold text-aurora-text-sec mb-1.5">
                Reason <span className="text-red-400">*</span> (at least 8 characters)
              </label>
              <textarea
                id="counselorShiftReason"
                value={shiftReason}
                onChange={(e) => setShiftReason(e.target.value)}
                rows={3}
                placeholder="Briefly explain why you need this change…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-aurora-border bg-aurora-card-alt text-white text-sm outline-none resize-none
                           placeholder:text-aurora-text-muted focus:ring-2 focus:ring-aurora-blue/30"
              />
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCollegeShiftOpen(false)}
                disabled={shiftSubmitting}
                className="flex-1 py-2.5 rounded-full text-sm font-bold text-white bg-white/5 border border-aurora-border cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitCollegeShift()}
                disabled={shiftSubmitting || !shiftTargetCollege || !shiftReason.trim()}
                className="flex-1 py-2.5 rounded-full text-sm font-bold text-white bg-aurora-blue cursor-pointer disabled:opacity-60"
              >
                {shiftSubmitting ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}