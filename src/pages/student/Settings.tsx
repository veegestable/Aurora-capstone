import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserDaySettings } from '../../contexts/UserDaySettingsContext'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, Clock, Globe, Shield, BookOpen } from 'lucide-react'

export default function StudentSettings() {
  const { user, updateUser, signOut } = useAuth()
  const { settings, updateSettings, isLoading: settingsLoading } = useUserDaySettings()
  const navigate = useNavigate()
  
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [dayResetHour, setDayResetHour] = useState(0)
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [shareCheckIns, setShareCheckIns] = useState(true)
  const [academicMode, setAcademicMode] = useState<'active' | 'relaxed' | 'off'>('active')

  useEffect(() => {
    if (settings) {
      if (settings.dayResetHour !== undefined) setDayResetHour(settings.dayResetHour)
      if (settings.timezone !== undefined) setTimezone(settings.timezone)
      if (settings.shareCheckInsWithGuidance !== undefined) setShareCheckIns(settings.shareCheckInsWithGuidance)
      if (settings.academicContextMode !== undefined) setAcademicMode(settings.academicContextMode)
    }
  }, [settings])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    setMessage(null)
    try {
      if (fullName.trim() !== user?.full_name) {
        await updateUser({ full_name: fullName.trim() })
      }
      
      await updateSettings({
        dayResetHour,
        timezone,
        shareCheckInsWithGuidance: shareCheckIns,
        academicContextMode: academicMode
      })
      
      setMessage({ type: 'success', text: 'Settings updated successfully!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update settings' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSignOut = async () => {
    if (!window.confirm('Are you sure you want to sign out?')) return
    try {
      await signOut()
      navigate('/')
    } catch { /* silent */ }
  }

  if (settingsLoading) {
    return <div className="p-8 text-center text-aurora-text-sec">Loading settings...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white font-heading">Settings</h2>
        <p className="text-aurora-text-sec text-sm">Manage your account and app preferences</p>
      </div>

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        {/* Profile Section */}
        <div className="card-aurora p-5">
          <div className="flex items-center mb-4">
            <div className="bg-[rgba(45,107,255,0.2)] p-2 rounded-full mr-3">
              <User className="w-5 h-5 text-aurora-blue" />
            </div>
            <h3 className="text-lg font-semibold text-white">Profile Information</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-aurora-text-sec mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-3 rounded-[12px] border border-white/8 bg-aurora-card text-white focus:ring-2 focus:ring-aurora-blue/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-aurora-text-sec mb-2">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3.5 py-3 rounded-[12px] border border-white/8 bg-aurora-card-dark text-aurora-text-muted cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Day & Time Settings */}
        <div className="card-aurora p-5">
          <div className="flex items-center mb-4">
            <div className="bg-[rgba(124,58,237,0.2)] p-2 rounded-full mr-3">
              <Clock className="w-5 h-5 text-aurora-purple" />
            </div>
            <h3 className="text-lg font-semibold text-white">Day & Time</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-aurora-text-sec mb-2">Day Reset Hour (0-23)</label>
              <input
                type="number"
                min="0" max="23"
                value={dayResetHour}
                onChange={(e) => setDayResetHour(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-3 rounded-[12px] border border-white/8 bg-aurora-card text-white focus:ring-2 focus:ring-aurora-blue/30"
              />
              <p className="text-xs text-aurora-text-muted mt-1">When does your day end? (e.g. 0 = Midnight, 3 = 3 AM)</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-aurora-text-sec mb-2">Timezone</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3.5 w-4 h-4 text-aurora-text-muted" />
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-3 rounded-[12px] border border-white/8 bg-aurora-card text-white focus:ring-2 focus:ring-aurora-blue/30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Context Settings */}
        <div className="card-aurora p-5">
          <div className="flex items-center mb-4">
            <div className="bg-[rgba(34,197,94,0.2)] p-2 rounded-full mr-3">
              <Shield className="w-5 h-5 text-aurora-green" />
            </div>
            <h3 className="text-lg font-semibold text-white">Privacy & Context</h3>
          </div>

          <div className="space-y-5">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-white">Share check-ins with counselor</p>
                <p className="text-xs text-aurora-text-muted mt-0.5">Allows counselors to provide better support based on your mood logs</p>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={shareCheckIns} onChange={(e) => setShareCheckIns(e.target.checked)} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${shareCheckIns ? 'bg-aurora-blue' : 'bg-white/10'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${shareCheckIns ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>

            <div>
              <label className="block text-xs font-semibold text-aurora-text-sec mb-2 items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                Academic Context Mode
              </label>
              <select
                value={academicMode}
                onChange={(e) => setAcademicMode(e.target.value as any)}
                className="w-full px-3.5 py-3 rounded-[12px] border border-white/8 bg-aurora-card text-white focus:ring-2 focus:ring-aurora-blue/30"
              >
                <option value="active">Active (Track assignments & deadlines)</option>
                <option value="relaxed">Relaxed (Low pressure mode)</option>
                <option value="off">Off (Hide academic features)</option>
              </select>
            </div>
          </div>
        </div>

        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-aurora-green' : 'text-aurora-red'}`}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={isUpdating}
          className="btn-aurora w-full disabled:opacity-50 cursor-pointer"
        >
          {isUpdating ? 'Saving Changes...' : 'Save Settings'}
        </button>
      </form>

      {/* Account Actions */}
      <div className="card-aurora p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-[12px] bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)]
                     text-aurora-red font-semibold hover:bg-[rgba(239,68,68,0.25)] transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  )
}