import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import { authService } from '../services/firebase-auth'
import logoDark from '../assets/logos/logo dark.png'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      await authService.resetPassword(email.trim())
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send reset email')
    }
  }

  return (
    <div className="min-h-screen gradient-aurora-light flex items-center justify-center px-4">
      <div className="card-aurora max-w-md w-full">
        <div className="text-center mb-6">
          <img src={logoDark} alt="Aurora" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-aurora-primary-dark font-heading">
            Reset Password
          </h1>
          <p className="text-aurora-gray-500 mt-2 text-sm">
            Enter your email and we'll send a password reset link.
          </p>
        </div>

        {status === 'sent' ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-aurora-accent-green/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-aurora-accent-green" />
            </div>
            <p className="text-aurora-primary-dark font-semibold">Check your inbox</p>
            <p className="text-aurora-gray-500 text-sm mt-2">
              We sent a password reset link to <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-aurora-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-aurora-gray-200 bg-aurora-gray-50
                           text-aurora-primary-dark placeholder:text-aurora-gray-400
                           focus:outline-none focus:ring-2 focus:ring-aurora-secondary-blue/30 focus:border-aurora-secondary-blue"
                required
              />
            </div>
            {status === 'error' && (
              <p className="text-sm text-aurora-accent-red">{errorMessage}</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-aurora w-full py-3 rounded-xl disabled:opacity-50 cursor-pointer"
            >
              {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <Link
          to="/"
          className="flex items-center justify-center gap-2 mt-6 text-sm text-aurora-secondary-blue hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    </div>
  )
}