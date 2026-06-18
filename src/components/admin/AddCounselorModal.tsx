import { useState } from 'react'
import { Eye, EyeOff, Loader2, UserPlus, X } from 'lucide-react'
import { COLLEGES, isCollegeCode, type CollegeCode } from '../../constants/colleges'
import { getSignupEmailRejectionMessage } from '../../utils/signupEmailPolicy'
import { adminService } from '../../services/admin'
import { auditLogsService } from '../../services/audit-logs'
import { useAuth } from '../../contexts/AuthContext'

interface AddCounselorModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const EMPTY_FORM = {
  fullName: '',
  email: '',
  contactNumber: '',
  collegeCode: '' as CollegeCode | '',
  password: '',
}

export function AddCounselorModal({ open, onClose, onCreated }: AddCounselorModalProps) {
  const { user } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ email: string } | null>(null)

  if (!open) return null

  const resetAndClose = () => {
    if (loading) return
    setForm(EMPTY_FORM)
    setError('')
    setSuccess(null)
    setShowPassword(false)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const policyError = getSignupEmailRejectionMessage(form.email)
    if (policyError) {
      setError(policyError)
      return
    }
    if (!form.fullName.trim()) {
      setError('Enter the counselor\'s full name.')
      return
    }
    if (!form.collegeCode || !isCollegeCode(form.collegeCode)) {
      setError('Select a college for this counselor.')
      return
    }
    if (form.password.length < 6) {
      setError('Temporary password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const { uid } = await adminService.createCounselorAccount({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        college_code: form.collegeCode,
        ...(form.contactNumber.trim()
          ? { contact_number: form.contactNumber.trim() }
          : {}),
      })
      auditLogsService.writeAuditLog({
        performedBy: user?.id ?? 'unknown',
        performedByRole: 'admin',
        action: 'counselor_created',
        targetType: 'user',
        targetId: uid,
        metadata: {
          counselorName: form.fullName.trim(),
          counselorEmail: form.email.trim().toLowerCase(),
          collegeCode: form.collegeCode,
        },
      })
      setSuccess({ email: form.email.trim().toLowerCase() })
      onCreated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create counselor account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-5"
      style={{ backgroundColor: 'rgba(3,8,24,0.55)' }}
      onClick={resetAndClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add counselor account"
    >
      <div
        className="w-full max-w-md bg-aurora-card border border-white/8 rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-aurora-blue" />
            <h3 className="text-base font-extrabold text-white">Add counselor</h3>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            disabled={loading}
            className="p-1 rounded-lg text-aurora-text-muted hover:text-white hover:bg-white/5 cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4">
            <p className="text-sm text-green-400 font-semibold">
              Counselor account created for {success.email}.
            </p>
            <p className="text-sm text-aurora-text-sec leading-relaxed">
              Share the temporary password with the counselor securely. They can sign in
              immediately, then use <strong className="text-white font-semibold">Forgot password</strong> on
              the login screen to set their own password.
            </p>
            <button
              type="button"
              onClick={resetAndClose}
              className="btn-aurora w-full cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <p className="text-xs text-aurora-text-sec leading-relaxed">
              Counselor accounts are created here by admin only. The account is approved
              immediately — no public signup.
            </p>

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="add-counselor-name" className="block text-xs font-semibold text-aurora-text-sec mb-2">
                Full name
              </label>
              <input
                id="add-counselor-name"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className="w-full px-4 py-3 border border-white/8 rounded-[12px] text-white bg-white/5 outline-hidden focus:ring-2 focus:ring-aurora-blue/30"
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="add-counselor-email" className="block text-xs font-semibold text-aurora-text-sec mb-2">
                Email
              </label>
              <input
                id="add-counselor-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 border border-white/8 rounded-[12px] text-white bg-white/5 outline-hidden focus:ring-2 focus:ring-aurora-blue/30"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="add-counselor-contact" className="block text-xs font-semibold text-aurora-text-sec mb-2">
                Contact number <span className="text-aurora-text-muted">(optional)</span>
              </label>
              <input
                id="add-counselor-contact"
                value={form.contactNumber}
                onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
                className="w-full px-4 py-3 border border-white/8 rounded-[12px] text-white bg-white/5 outline-hidden focus:ring-2 focus:ring-aurora-blue/30"
                autoComplete="tel"
              />
            </div>

            <div>
              <label htmlFor="add-counselor-college" className="block text-xs font-semibold text-aurora-text-sec mb-2">
                College
              </label>
              <select
                id="add-counselor-college"
                value={form.collegeCode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    collegeCode: e.target.value as CollegeCode | '',
                  }))
                }
                className="w-full px-4 py-3 border border-white/8 rounded-[12px] text-white bg-white/5 outline-hidden focus:ring-2 focus:ring-aurora-blue/30"
                required
              >
                <option value="" disabled className="bg-[#0B0D30]">
                  Select college
                </option>
                {COLLEGES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#0B0D30]">
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="add-counselor-password" className="block text-xs font-semibold text-aurora-text-sec mb-2">
                Temporary password
              </label>
              <div className="relative">
                <input
                  id="add-counselor-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-3 pr-12 border border-white/8 rounded-[12px] text-white bg-white/5 outline-hidden focus:ring-2 focus:ring-aurora-blue/30"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-aurora-text-muted hover:text-white cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-aurora-text-muted">
                Share this with the counselor once. They can change it via Forgot password on login.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={resetAndClose}
                disabled={loading}
                className="flex-1 min-h-[44px] rounded-full border border-white/15 text-white text-sm font-semibold hover:bg-white/5 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 min-h-[44px] rounded-full btn-aurora disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
