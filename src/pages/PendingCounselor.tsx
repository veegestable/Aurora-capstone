import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Clock, LogOut } from 'lucide-react'

export default function PendingCounselor() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen gradient-aurora-light flex items-center justify-center px-4">
      <div className="card-aurora max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-aurora-primary-dark font-heading mb-3">
          Pending Admin Approval
        </h1>
        <p className="text-aurora-gray-500 leading-relaxed mb-8">
          Thank you for signing up as a counselor. Your account is under review.
          An administrator will approve your access to oversee students soon.
        </p>
        <p className="text-aurora-gray-400 text-sm mb-8">
          You can sign out and check back later.
        </p>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                     bg-red-50 border border-red-200 text-aurora-accent-red font-semibold
                     hover:bg-red-100 transition-colors cursor-pointer"
          aria-label="Sign out"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign Out
        </button>
      </div>
    </div>
  )
}