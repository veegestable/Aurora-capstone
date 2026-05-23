import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, RefreshCw, X } from 'lucide-react'
import { adminService } from '../../services/admin'
import { getCollegeName, resolveCollegeCodeFromUserData } from '../../constants/colleges'
import { AdminPageHeader } from '../../components/admin/AdminPageHeader'

type Row = Record<string, unknown> & { id: string }

export default function AdminCollegeShifts() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setRows(await adminService.getUsersWithPendingCollegeShifts())
    } catch (e) {
      console.error('College shifts load:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    void load()
  }

  const approve = async (r: Row) => {
    if (!window.confirm(`Approve college change for ${String(r.full_name ?? 'user')}?`)) return
    setBusyId(r.id)
    try {
      await adminService.adminApproveCollegeShift(r.id)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not approve request.')
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (r: Row) => {
    if (!window.confirm(`Reject college change for ${String(r.full_name ?? 'user')}?`)) return
    setBusyId(r.id)
    try {
      await adminService.adminRejectCollegeShift(r.id)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not reject request.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <AdminPageHeader
        kicker="Admin"
        title="College change requests"
        subtitle="Approve or reject student and counselor college shifts."
        action={
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-aurora-blue hover:bg-aurora-blue/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <Link
        to="/admin/messaging-repair"
        className="block card-aurora border border-aurora-blue/40 bg-aurora-blue/10 p-4 hover:bg-aurora-blue/[0.14] transition-colors"
      >
        <p className="text-[#93C5FD] font-bold text-sm">Repair message college tags</p>
        <p className="text-aurora-text-sec text-xs mt-1.5 leading-relaxed">
          If someone already transferred back but chats stay read-only in Past college, run a
          one-time tag repair by email.
        </p>
      </Link>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-aurora-border border-t-aurora-blue" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-aurora-text-muted">No pending college change requests.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const req = r.college_shift_request as
              | {
                  requested_college_code?: string
                  requested_program?: string
                  reason?: string
                }
              | undefined
            const from = resolveCollegeCodeFromUserData(r)
            const to = req?.requested_college_code ?? ''
            const role = String(r.role ?? '')
            return (
              <article key={r.id} className="card-aurora p-4 space-y-2">
                <h3 className="text-white font-bold text-base">{String(r.full_name ?? 'User')}</h3>
                <p className="text-aurora-text-sec text-xs">
                  {role} · {String(r.email ?? '')}
                </p>
                <p className="text-aurora-text-sec text-sm">
                  From: {from ? `${from} — ${getCollegeName(from)}` : '(unset)'}
                </p>
                <p className="text-[#B9CCFF] text-sm">
                  To: {to ? `${to} — ${getCollegeName(to)}` : '—'}
                </p>
                {role === 'student' ? (
                  <p className="text-aurora-text-sec text-xs">
                    Requested program: {String(req?.requested_program ?? '—')}
                  </p>
                ) : null}
                <p className="text-white text-sm leading-relaxed">
                  Reason: {String(req?.reason ?? '—')}
                </p>
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => void approve(r)}
                    disabled={busyId === r.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-green-500/20 border border-green-500/45 text-[#86EFAC] font-bold text-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-[18px] h-[18px]" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void reject(r)}
                    disabled={busyId === r.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 font-bold text-sm disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-[18px] h-[18px]" />
                    Reject
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
