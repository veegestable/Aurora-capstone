import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { authService } from '../services/firebase-auth'
import { getPasswordResetRetryAfterSeconds } from '../services/firebase-auth/auth/passwordResetTrustedErrors'

const PASSWORD_RESET_COOLDOWN_SEC = 60

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const t = window.setTimeout(() => {
      setCooldownSeconds((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearTimeout(t)
  }, [cooldownSeconds])

  const startCooldown = (seconds = PASSWORD_RESET_COOLDOWN_SEC) => {
    setCooldownSeconds(seconds)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email.trim()) {
      setError('Enter your account email.')
      return
    }
    if (loading || cooldownSeconds > 0) return

    setLoading(true)
    setError('')
    try {
      await authService.sendPasswordReset(email)
      setSent(true)
      startCooldown()
    } catch (err: unknown) {
      const retry = getPasswordResetRetryAfterSeconds(err)
      if (retry != null && retry > 0) {
        startCooldown(retry)
      }
      setError(err instanceof Error ? err.message : 'Could not send reset email.')
    } finally {
      setLoading(false)
    }
  }

  const submitDisabled = loading || cooldownSeconds > 0

  return (
    <div className="min-h-screen bg-aurora-bg flex items-center justify-center px-4">
      <div className="card-aurora max-w-md w-full p-6">
        <h1 className="text-lg font-semibold text-white font-heading text-center">
          Reset password
        </h1>

        <p className="mt-2 text-sm text-aurora-text-sec text-center leading-relaxed">
          Enter your email and we&apos;ll send a link to choose a new password.
          Counselors who received a temporary password from admin can use this too.
        </p>

        {sent && (
          <div className="mt-4 p-3 bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.3)] rounded-[12px] text-aurora-green text-sm" role="status">
            If an account exists for{' '}
            <span className="text-white font-medium">{email.trim().toLowerCase()}</span>,
            we sent a link to set a new password. Check your inbox and spam folder.
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          {error && (
            <p className="text-sm text-red-400 text-center" role="alert">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="reset-email" className="block text-xs font-semibold text-aurora-text-sec mb-2">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-white/8 rounded-[12px] text-white bg-white/5 outline-hidden focus:ring-2 focus:ring-aurora-blue/30"
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={submitDisabled}
            className="btn-aurora w-full disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading
              ? 'Sending…'
              : cooldownSeconds > 0
                ? sent
                  ? `Resend available in ${cooldownSeconds}s`
                  : `Try again in ${cooldownSeconds}s`
                : sent
                  ? 'Send reset link again'
                  : 'Send reset link'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 text-sm text-aurora-blue hover:text-aurora-blue-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
