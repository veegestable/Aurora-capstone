import { useState, useEffect } from 'react'
import { adminService, type AdminCounselorUser } from '../../services/admin'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { LetterAvatar } from '../../components/LetterAvatar'
import { Users, Check, X, RefreshCw } from 'lucide-react'
import type { CounselorApprovalStatus } from '../../types/user.types'

export default function AdminCounselors() {
  const [counselors, setCounselors] = useState<AdminCounselorUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | CounselorApprovalStatus>('all')

  const loadCounselors = async () => {
    setLoading(true)
    try {
      setCounselors(await adminService.getCounselors())
    } catch (error) {
      console.error('Failed to load counselors:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCounselors() }, [])

  const handleApproval = async (c: AdminCounselorUser, status: CounselorApprovalStatus) => {
    const action = status === 'approved' ? 'approve' : 'reject'
    if (!window.confirm(`Are you sure you want to ${action} ${c.full_name}?`)) return

    setUpdatingId(c.id)
    try {
      await adminService.updateCounselorApproval(c.id, status)
      await loadCounselors()
    } catch {
      alert(`Could not ${action} counselor. Please try again.`)
    } finally {
      setUpdatingId(null)
    }
  }

  const pendingCount = counselors.filter(c => c.approval_status === 'pending').length
  const filtered = filter === 'all'
    ? counselors
    : counselors.filter(c => (c.approval_status ?? 'pending') === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-primary-dark/40 uppercase">Admin</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading mt-1">
            Counselors
          </h2>
        </div>
        <button
          onClick={loadCounselors}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-aurora-secondary-blue hover:bg-aurora-secondary-blue/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Refresh counselor list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-600 text-sm font-semibold">
            {pendingCount} counselor{pendingCount !== 1 ? 's' : ''} awaiting approval
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(key => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
              filter === key
                ? 'bg-aurora-secondary-blue text-white'
                : 'bg-aurora-primary-dark/5 text-aurora-primary-dark/60 hover:bg-aurora-primary-dark/10'
            }`}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-secondary-blue" />
          <span className="ml-3 text-aurora-primary-dark/50 text-sm">Loading counselors...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-aurora-primary-dark/20 mx-auto mb-3" />
          <p className="text-aurora-primary-dark/50 text-sm">
            {filter === 'all' ? 'No counselors yet.' : `No ${filter} counselors.`}
          </p>
          <p className="text-aurora-primary-dark/30 text-xs mt-1">
            Counselors sign up from the login screen and appear here for approval.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="card-aurora p-4">
              <div className="flex items-center gap-3">
                <LetterAvatar name={c.full_name || 'Unknown'} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-aurora-primary-dark text-sm truncate">
                    {c.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-aurora-primary-dark/50 truncate">{c.email}</p>
                </div>
                <StatusBadge status={c.approval_status} />
              </div>

              {(c.approval_status === 'pending' || !c.approval_status) && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleApproval(c, 'approved')}
                    disabled={!!updatingId}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-green-600 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 transition-colors cursor-pointer disabled:opacity-50"
                    aria-label={`Approve ${c.full_name}`}
                  >
                    {updatingId === c.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleApproval(c, 'rejected')}
                    disabled={!!updatingId}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-red-500 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                    aria-label={`Reject ${c.full_name}`}
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}