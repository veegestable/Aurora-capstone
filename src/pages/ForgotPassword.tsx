import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import { authService } from '../services/firebase-auth'
import logoLight from '../assets/logos/logo light.png'

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
    <div className="min-h-screen bg-aurora-bg flex items-center justify-center px-4">
      <div className="card-aurora max-w-md w-full p-6">
        <div className="text-center mb-6">
          <img src={logoLight} alt="Aurora" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white font-heading">
            Reset Password
          </h1>
          <p className="text-aurora-text-sec mt-2 text-sm">
            Enter your email and we'll send a password reset link.
          </p>
        </div>

        {status === 'sent' ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-[rgba(34,197,94,0.2)] flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-aurora-green" />
            </div>
            <p className="text-white font-semibold">Check your inbox</p>
            <p className="text-aurora-text-sec text-sm mt-2">
              We sent a password reset link to <strong className="text-white">{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-aurora-text-sec mb-2 tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-3 rounded-[12px] border border-white/8 bg-aurora-card
                           text-white placeholder:text-aurora-text-muted
                           focus:outline-none focus:ring-2 focus:ring-aurora-blue/30 focus:border-aurora-blue"
                required
              />
            </div>
            {status === 'error' && (
              <p className="text-sm text-aurora-red">{errorMessage}</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-aurora w-full disabled:opacity-50 cursor-pointer"
            >
              {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <Link
          to="/"
          className="flex items-center justify-center gap-2 mt-6 text-sm text-aurora-blue hover:text-aurora-blue-light transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    </div>
  )
}