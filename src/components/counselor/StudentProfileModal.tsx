import { X, MessageSquare, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LetterAvatar } from '../LetterAvatar'
import { useAuth } from '../../contexts/AuthContext'
import { messagesService } from '../../services/messages'
import type { CounselorSignalPill } from '../../constants/counselor/counselor-checkin-signals'
import { COUNSELOR_SIGNAL_LABEL } from '../../constants/counselor/counselor-checkin-signals'

export interface CheckInStats {
  count: number
  avgStress: number
  avgEnergy: number
  dominantMood: string
  stabilityScore: number
}

interface StudentProfileModalProps {
  isOpen: boolean
  onClose: () => void
  student: {
    id: string
    full_name: string
    email?: string
    signal: CounselorSignalPill
    stats?: CheckInStats
  } | null
}

function StatTile({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="card-aurora p-3 text-center">
      <p className="text-[10px] uppercase font-bold text-aurora-primary-dark/50 mb-1">{label}</p>
      <p className="text-xl font-extrabold text-aurora-primary-dark">{value}</p>
      {subtext && <p className="text-[10px] text-aurora-primary-dark/40 mt-1">{subtext}</p>}
    </div>
  )
}

function getSignalStyle(signal: CounselorSignalPill) {
  switch (signal) {
    case 'higher_self_report':
      return { border: 'border-l-red-500', badgeBg: 'bg-red-500/10', badgeBorder: 'border-red-500/25', text: 'text-red-500', hex: '#ef4444' }
    case 'moderate_self_report':
      return { border: 'border-l-orange-500', badgeBg: 'bg-orange-500/10', badgeBorder: 'border-orange-500/25', text: 'text-orange-500', hex: '#f97316' }
    case 'typical_self_report':
      return { border: 'border-l-blue-500', badgeBg: 'bg-blue-500/10', badgeBorder: 'border-blue-500/25', text: 'text-blue-500', hex: undefined }
    case 'no_checkins':
      return { border: 'border-l-amber-400', badgeBg: 'bg-amber-400/10', badgeBorder: 'border-amber-400/25', text: 'text-amber-400', hex: undefined }
    case 'sharing_off':
      return { border: 'border-l-gray-400', badgeBg: 'bg-gray-400/10', badgeBorder: 'border-gray-400/25', text: 'text-gray-400', hex: undefined }
  }
}

export function StudentProfileModal({ isOpen, onClose, student }: StudentProfileModalProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isBusy, setIsBusy] = useState(false)

  if (!isOpen || !student) return null

  const style = getSignalStyle(student.signal)
  const hasStats = student.stats && student.stats.count > 0
  const isAlerted = student.signal === 'higher_self_report'

  const handleInvite = async () => {
    if (!user?.id) return
    setIsBusy(true)
    try {
      await messagesService.createConversation(
        user.id,
        {
          id: student.id,
          name: student.full_name,
          isAlerted,
          borderColor: style.hex,
        },
        {
          name: user.full_name || 'Counselor',
          avatar: user.avatar_url || ''
        }
      )
      onClose()
      navigate('/counselor/messages')
    } catch (e) {
      console.error('Failed to start chat:', e)
      alert('Could not start chat. Please try again in a moment.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-aurora-bg/80 backdrop-blur-sm">
      <div className="card-aurora w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border-white/8 shadow-2xl">
        <div className="flex items-start justify-between p-4 border-b border-aurora-border">
          <h2 className="text-lg font-extrabold text-aurora-primary-dark font-heading">Student Profile</h2>
          <button onClick={onClose} className="p-1 text-aurora-primary-dark/50 hover:text-aurora-primary-dark transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-4 mb-6">
            <LetterAvatar name={student.full_name} size={64} />
            <div>
              <h3 className="text-xl font-bold text-aurora-primary-dark">{student.full_name}</h3>
              <p className="text-sm text-aurora-primary-dark/60">{student.email}</p>
              <span className={`inline-block mt-2 text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-full border ${style.badgeBg} ${style.badgeBorder} ${style.text}`}>
                {COUNSELOR_SIGNAL_LABEL[student.signal]}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-bold text-aurora-primary-dark mb-3">Check-In Summary (Last 3 Days)</h4>
            {hasStats ? (
              <div className="space-y-4">
                <p className="text-xs text-aurora-primary-dark/60 leading-relaxed">
                  Built from the same self-report scales as the student app (1–5 stress & energy). Not a clinical assessment.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <StatTile label="Check-ins" value={student.stats!.count} />
                  <StatTile label="Dominant Mood" value={student.stats!.dominantMood} />
                  <StatTile label="Avg Stress" value={`${student.stats!.avgStress.toFixed(1)}/5`} />
                  <StatTile label="Avg Energy" value={`${student.stats!.avgEnergy.toFixed(1)}/5`} />
                  <div className="col-span-2">
                    <StatTile label="Stability" value={`${student.stats!.stabilityScore}%`} subtext="Based on mood intensity variance between check-ins" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-aurora p-4 text-center bg-aurora-bg/50">
                <p className="text-sm text-aurora-primary-dark/50">
                  {student.signal === 'sharing_off' 
                    ? 'This student has not enabled check-in sharing. Aurora does not show mood summaries without consent.'
                    : 'Sharing is on, but there are no check-ins in Aurora for the last 3 days — so there is nothing to summarize yet.'}
                </p>
              </div>
            )}
          </div>
          
          <p className="text-xs text-aurora-primary-dark/60 mb-4 text-center leading-relaxed px-2">
            {hasStats
              ? 'Figures above are self-reported summaries only — not a diagnosis. Use messages to coordinate a session respectfully.'
              : 'This student has not shared recent check-ins in Aurora. You can still invite them to a session: sharing only controls summaries here, not whether you may reach out through the app.'}
          </p>

          <button
            onClick={handleInvite}
            disabled={isBusy}
            className="w-full btn-aurora flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4" />
            )}
            Invite to session (open chat)
          </button>
        </div>
      </div>
    </div>
  )
}