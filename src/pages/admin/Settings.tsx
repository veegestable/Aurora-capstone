import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { SignOutConfirmModal } from '../../components/common/SignOutConfirmModal'

export default function AdminSettings() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [signOutVisible, setSignOutVisible] = useState(false)
  const [signOutBusy, setSignOutBusy] = useState(false)

  const handleSignOut = async () => {
    setSignOutBusy(true)
    try {
      await signOut()
      navigate('/')
    } catch {
      setSignOutBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[rgba(45,107,255,0.2)] flex items-center justify-center">
          <Shield className="w-[22px] h-[22px] text-aurora-blue" />
        </div>
        <div>
          <p className="text-xs tracking-wide text-aurora-text-sec uppercase">Admin</p>
          <h2 className="text-lg font-bold text-white">Settings</h2>
        </div>
      </div>

      <p className="text-sm text-aurora-text-sec leading-relaxed">
        Platform preferences and account. More options can be added here later.
      </p>

      <div className="card-aurora p-4">
        <p className="text-xs text-aurora-text-sec mb-1">Signed in as</p>
        <p className="text-base font-semibold text-white">{user?.full_name ?? 'Admin'}</p>
        <p className="text-sm text-aurora-text-muted mt-1">{user?.email}</p>
      </div>

      <button
        type="button"
        onClick={() => setSignOutVisible(true)}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-[14px] bg-red-500/12 border border-red-500/35 text-aurora-red font-bold text-base hover:bg-red-500/18 transition-colors cursor-pointer"
      >
        <LogOut className="w-5 h-5" />
        Log out
      </button>

      <SignOutConfirmModal
        visible={signOutVisible}
        onStay={() => setSignOutVisible(false)}
        onLeave={handleSignOut}
        leaving={signOutBusy}
      />
    </div>
  )
}
