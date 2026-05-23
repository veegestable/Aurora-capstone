import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Search } from 'lucide-react'
import { adminService, formatRepairSummary } from '../../services/admin'
import {
  getCollegeName,
  resolveCollegeCodeFromUserData,
} from '../../constants/colleges'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'

type FoundUser = Record<string, unknown> & { id: string }

export default function AdminMessagingRepair() {
  const [email, setEmail] = useState('')
  const [found, setFound] = useState<FoundUser | null>(null)
  const [searching, setSearching] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const search = async () => {
    const q = email.trim()
    if (!q) {
      setError('Type the user\'s account email.')
      return
    }
    setSearching(true)
    setFound(null)
    setMessage(null)
    setError(null)
    try {
      const user = await adminService.findUserByEmailForAdmin(q)
      if (!user) {
        setError('No account found. Check the email and try again.')
        return
      }
      const role = String(user.role ?? '')
      if (role !== 'student' && role !== 'counselor') {
        setError('Repair applies to students and counselors only.')
        return
      }
      setFound(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not look up user.')
    } finally {
      setSearching(false)
    }
  }

  const repair = async () => {
    if (!found) return
    if (
      !window.confirm(
        `Repair conversation college tags for ${String(found.full_name ?? found.email)}?`,
      )
    ) {
      return
    }
    setRepairing(true)
    setMessage(null)
    setError(null)
    try {
      const result = await adminService.adminRepairConversationCollegeTags(found.id)
      setMessage(formatRepairSummary(result))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Repair failed.')
    } finally {
      setRepairing(false)
    }
  }

  const college = found ? resolveCollegeCodeFromUserData(found) : ''

  return (
    <div className="space-y-6 max-w-xl">
      <Link
        to="/admin/college-shifts"
        className="inline-flex items-center gap-2 text-sm text-aurora-text-sec hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <AdminPageHeader
        kicker="Admin"
        title="Repair message tags"
        subtitle="Fix inbox vs past-college after a student or counselor returns to a college."
      />

      <div className="card-aurora p-4 space-y-3">
        <label className="block text-xs font-semibold text-aurora-text-sec" htmlFor="repair-email">
          User email
        </label>
        <div className="flex gap-2">
          <input
            id="repair-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@msu.edu.ph"
            className="flex-1 px-3.5 py-3 text-sm text-white bg-aurora-bg rounded-xl border border-aurora-border placeholder:text-aurora-text-muted focus:border-aurora-blue outline-none"
          />
          <button
            type="button"
            onClick={() => void search()}
            disabled={searching}
            className="btn-aurora px-4 py-3 flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            {searching ? '…' : 'Find'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-aurora-red bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          {error}
        </p>
      ) : null}

      {found ? (
        <div className="card-aurora p-4 space-y-3">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-aurora-blue shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">{String(found.full_name ?? 'User')}</p>
              <p className="text-xs text-aurora-text-sec mt-1">{String(found.email ?? '')}</p>
              <p className="text-sm text-aurora-text-sec mt-2">
                College:{' '}
                {college ? `${college} (${getCollegeName(college)})` : 'Not set on profile'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void repair()}
            disabled={repairing || !college}
            className="w-full btn-aurora py-3 disabled:opacity-50 cursor-pointer"
          >
            {repairing ? 'Repairing…' : 'Run tag repair'}
          </button>
        </div>
      ) : null}

      {message ? (
        <pre className="text-xs text-aurora-text-sec whitespace-pre-wrap card-aurora p-4 font-mono">
          {message}
        </pre>
      ) : null}
    </div>
  )
}
