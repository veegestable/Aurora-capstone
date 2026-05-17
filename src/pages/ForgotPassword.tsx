import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Placeholder — matches mobile `app/(auth)/forgot-password.tsx` (not wired to auth yet). */
export default function ForgotPassword() {
  return (
    <div className="min-h-screen bg-aurora-bg flex items-center justify-center px-4">
      <div className="card-aurora max-w-md w-full p-6 text-center">
        <h1 className="text-lg font-semibold text-white font-heading">
          Forgot Password
        </h1>
        <p className="mt-2 text-sm text-aurora-text-sec">
          Password recovery screen will be connected in the auth module.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 mt-6 text-sm text-aurora-blue hover:text-aurora-blue-light transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    </div>
  )
}
