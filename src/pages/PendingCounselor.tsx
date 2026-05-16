import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Clock, LogOut } from 'lucide-react'
import { SignOutConfirmModal } from '../components/common/SignOutConfirmModal'

export default function PendingCounselor() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

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
    <div className="min-h-screen bg-aurora-bg flex items-center justify-center px-4">
      <div className="card-aurora max-w-md w-full text-center p-6">
        <div className="w-20 h-20 rounded-full bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-aurora-amber" />
        </div>
        <h1 className="text-2xl font-bold text-white font-heading mb-3">
          Pending Admin Approval
        </h1>
        <p className="text-aurora-text-sec leading-relaxed mb-8">
          Thank you for signing up as a counselor. Your account is under review.
          An administrator will approve your access to oversee students soon.
        </p>
        <p className="text-aurora-text-muted text-sm mb-8">
          You can sign out and check back later.
        </p>
        <button
          onClick={() => setShowSignOutModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[12px]
                     bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] text-aurora-red font-semibold
                     hover:bg-[rgba(239,68,68,0.25)] transition-colors cursor-pointer"
          aria-label="Sign out"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign Out
        </button>
      </div>

      <SignOutConfirmModal
        visible={showSignOutModal}
        onStay={() => setShowSignOutModal(false)}
        onLeave={handleSignOut}
        leaving={isSigningOut}
      />
    </div>
  )
}