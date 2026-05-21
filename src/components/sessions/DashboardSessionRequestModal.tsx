import { useState, useEffect } from 'react'
import { X, ArrowRight, Loader2, Check } from 'lucide-react'
import { usersService } from '../../services/users'
import { LetterAvatar } from '../LetterAvatar'

interface Counselor {
  id: string
  full_name?: string
  avatar_url?: string
}

interface DashboardSessionRequestModalProps {
  visible: boolean
  studentId: string
  onClose: () => void
  onSuccess: (payload: { counselorId: string }) => void
}

/** Step 1 (mobile parity): pick counselor, then continue in Messages. */
export function DashboardSessionRequestModal({
  visible,
  studentId,
  onClose,
  onSuccess,
}: DashboardSessionRequestModalProps) {
  const [counselors, setCounselors] = useState<Counselor[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selectedCounselorId, setSelectedCounselorId] = useState<string | null>(null)

  useEffect(() => {
    if (!visible || !studentId) return
    setSelectedCounselorId(null)
    setLoading(true)
    usersService
      .getCounselorsForStudent(studentId)
      .then((rows) => setCounselors(rows as Counselor[]))
      .catch(() => setCounselors([]))
      .finally(() => setLoading(false))
  }, [visible, studentId])

  useEffect(() => {
    if (!visible || counselors.length !== 1) return
    setSelectedCounselorId(counselors[0]?.id ?? null)
  }, [visible, counselors])

  const handleContinue = () => {
    if (!selectedCounselorId || busy) return
    setBusy(true)
    try {
      onSuccess({ counselorId: selectedCounselorId })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative w-full max-w-md card-aurora border border-aurora-border p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Request a Session</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-aurora-text-sec transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-aurora-text-sec mb-5 leading-relaxed">
          Choose your counselor here. Next you&apos;ll open Messages with the same preferred
          time and note form used when you request a session in chat.
        </p>

        <label className="text-xs font-semibold text-aurora-text-sec uppercase tracking-wider mb-2 block">
          Select Counselor
        </label>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-aurora-blue animate-spin" />
          </div>
        ) : counselors.length === 0 ? (
          <p className="text-sm text-aurora-text-muted mb-4">No counselors available.</p>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-2 mb-5 pr-1 scrollbar-hide">
            {counselors.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setSelectedCounselorId(c.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedCounselorId === c.id
                    ? 'border-aurora-blue bg-[rgba(45,107,255,0.08)]'
                    : 'border-transparent bg-white/3 hover:bg-white/5'
                }`}
              >
                <LetterAvatar
                  name={c.full_name ?? 'Counselor'}
                  size={40}
                  avatarUrl={c.avatar_url ?? undefined}
                />
                <span className="text-sm font-semibold text-white flex-1 text-left">
                  {c.full_name || 'Counselor'}
                </span>
                {selectedCounselorId === c.id && (
                  <div className="w-6 h-6 rounded-full bg-aurora-blue flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedCounselorId || busy || counselors.length === 0}
          className="w-full btn-aurora flex items-center justify-center gap-2.5 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Continue to Messages</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
