import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Loader2 } from 'lucide-react'
import { JournalCalendar } from '../../components/journal/JournalCalendar'
import { CounselorLast7MoodBars } from '../../components/counselor/CounselorLast7MoodBars'
import { useAuth } from '../../contexts/AuthContext'
import { messagesService } from '../../services/messages'
import type { CounselorSignalPill } from '../../constants/counselor/counselor-checkin-signals'
import { COUNSELOR_SIGNAL_LABEL } from '../../constants/counselor/counselor-checkin-signals'
import type { CheckInStats } from '../../types/counselor.types'

type LocationState = {
  full_name?: string
  email?: string
  signal?: CounselorSignalPill
  stats?: CheckInStats
}

function StatTile({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="card-aurora p-3 text-center border-white/8">
      <p className="text-[10px] uppercase font-bold text-aurora-text-muted mb-1">{label}</p>
      <p className="text-xl font-extrabold text-white">{value}</p>
      {subtext && <p className="text-[10px] text-aurora-text-muted mt-1">{subtext}</p>}
    </div>
  )
}

function getSignalStyle(signal: CounselorSignalPill) {
  switch (signal) {
    case 'higher_self_report':
      return { badgeBg: 'bg-red-500/10', badgeBorder: 'border-red-500/25', text: 'text-red-400', hex: '#ef4444' as const }
    case 'moderate_self_report':
      return { badgeBg: 'bg-orange-500/10', badgeBorder: 'border-orange-500/25', text: 'text-orange-400', hex: '#f97316' as const }
    case 'typical_self_report':
      return { badgeBg: 'bg-blue-500/10', badgeBorder: 'border-blue-500/25', text: 'text-blue-400', hex: undefined }
    case 'no_checkins':
      return { badgeBg: 'bg-amber-400/10', badgeBorder: 'border-amber-400/25', text: 'text-amber-400', hex: undefined }
  }
}

/** Counselor read-only workspace: last-7 bars + monthly journal calendar (`JournalCalendar` + `forUserId`). */
export default function CounselorStudentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [isBusy, setIsBusy] = useState(false)

  const state = (location.state ?? {}) as LocationState
  const fullName = state.full_name?.trim() || 'Student'
  const email = state.email
  const signal = state.signal ?? 'no_checkins'
  const style = getSignalStyle(signal)
  const hasStats = !!state.stats && state.stats.count > 0
  const isAlerted = signal === 'higher_self_report'

  const handleInvite = async () => {
    if (!user?.id || !id) return
    setIsBusy(true)
    try {
      await messagesService.createConversation(
        user.id,
        { id, name: fullName, isAlerted, borderColor: style.hex },
        { name: user.full_name || 'Counselor', avatar: user.avatar_url || '' },
      )
      navigate('/counselor/messages')
    } catch (e) {
      console.error('Failed to start chat:', e)
      alert('Could not start chat. Please try again in a moment.')
    } finally {
      setIsBusy(false)
    }
  }

  if (!id) {
    return <p className="text-sm text-aurora-text-muted">Missing student id.</p>
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <button
        type="button"
        onClick={() => navigate('/counselor/students')}
        className="flex items-center gap-2 text-sm font-semibold text-aurora-text-sec hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to directory
      </button>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">{fullName}</h1>
        {email && <p className="text-sm text-aurora-text-sec">{email}</p>}
        <span
          className={`inline-block text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-full border ${style.badgeBg} ${style.badgeBorder} ${style.text}`}
        >
          {COUNSELOR_SIGNAL_LABEL[signal]}
        </span>
      </div>

      {hasStats && state.stats && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white">Check-in summary (recent window)</h2>
          <p className="text-xs text-aurora-text-muted leading-relaxed">
            Self-report scales only — not a diagnosis. Refreshed when you open this page from the directory.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <StatTile label="Check-ins" value={state.stats.count} />
            <StatTile label="Dominant mood" value={state.stats.dominantMood} />
            <StatTile label="Avg stress" value={`${state.stats.avgStress.toFixed(1)}/5`} />
            <StatTile label="Avg energy" value={`${state.stats.avgEnergy.toFixed(1)}/5`} />
            <div className="col-span-2 sm:col-span-1">
              <StatTile label="Stability" value={`${state.stats.stabilityScore}%`} subtext="Variance-based" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-white">Last 7 days</h2>
        <CounselorLast7MoodBars studentId={id} />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-white">Mood journal (read-only)</h2>
        <p className="text-xs text-aurora-text-muted">
          Month view uses the same entries as the student app. Visibility depends on Firestore rules and consent policy.
        </p>
        <JournalCalendar forUserId={id} />
      </div>

      <button
        type="button"
        onClick={handleInvite}
        disabled={isBusy}
        className="w-full max-w-md btn-aurora flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
      >
        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
        Invite to session (open chat)
      </button>
    </div>
  )
}