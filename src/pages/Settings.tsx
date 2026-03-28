import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { User, LogOut } from 'lucide-react'

export default function Settings() {
  const { user, updateUser, signOut } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setMessage({ type: 'error', text: 'Full name cannot be empty' })
      return
    }
    setIsUpdating(true)
    setMessage(null)
    try {
      await updateUser({ full_name: fullName.trim() })
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update profile'
      setMessage({ type: 'error', text: msg })
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark font-heading">Settings</h2>
        <p className="text-aurora-gray-500 text-sm">Manage your account preferences</p>
      </div>

      {/* Profile Section */}
      <div className="card-aurora">
        <div className="flex items-center mb-4">
          <div className="bg-aurora-blue-100 p-2 rounded-full mr-3">
            <User className="w-5 h-5 text-aurora-secondary-blue" />
          </div>
          <h3 className="text-lg font-semibold text-aurora-primary-dark">Profile Information</h3>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-aurora-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-xl border border-aurora-gray-200 bg-aurora-gray-50
                         text-aurora-primary-dark placeholder:text-aurora-gray-400
                         focus:outline-none focus:ring-2 focus:ring-aurora-secondary-blue/30 focus:border-aurora-secondary-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-aurora-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 rounded-xl border border-aurora-gray-200 bg-aurora-gray-100
                         text-aurora-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-aurora-gray-400 mt-1 ml-1">Email cannot be changed</p>
          </div>

          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-aurora-accent-green' : 'text-aurora-accent-red'}`}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={isUpdating}
            className="btn-aurora w-full py-3 rounded-xl disabled:opacity-50 cursor-pointer"
          >
            {isUpdating ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>

      {/* Account Actions */}
      <div className="card-aurora">
        <h3 className="text-lg font-semibold text-aurora-primary-dark mb-4">Account</h3>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-red-50 border border-red-100
                     text-aurora-accent-red font-medium hover:bg-red-100 transition-colors cursor-pointer"
          aria-label="Sign out"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      <div className="text-center">
        <p className="text-aurora-gray-400 text-xs">Aurora App v1.0.0</p>
      </div>
    </div>
  )
}