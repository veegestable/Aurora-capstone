import { X, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LetterAvatar } from '../LetterAvatar'
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
      return { border: 'border-l-red-500', badgeBg: 'bg-red-500/10', badgeBorder: 'border-red-500/25', text: 'text-red-500' }
    case 'moderate_self_report':
      return { border: 'border-l-orange-500', badgeBg: 'bg-orange-500/10', badgeBorder: 'border-orange-500/25', text: 'text-orange-500' }
    case 'typical_self_report':
      return { border: 'border-l-blue-500', badgeBg: 'bg-blue-500/10', badgeBorder: 'border-blue-500/25', text: 'text-blue-500' }
    case 'no_checkins':
      return { border: 'border-l-amber-400', badgeBg: 'bg-amber-400/10', badgeBorder: 'border-amber-400/25', text: 'text-amber-400' }
    case 'sharing_off':
      return { border: 'border-l-gray-400', badgeBg: 'bg-gray-400/10', badgeBorder: 'border-gray-400/25', text: 'text-gray-400' }
  }
}

export function StudentProfileModal({ isOpen, onClose, student }: StudentProfileModalProps) {
  const navigate = useNavigate()

  if (!isOpen || !student) return null

  const style = getSignalStyle(student.signal)
  const hasStats = student.stats && student.stats.count > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-aurora-bg/80 backdrop-blur-sm">
      <div className="card-aurora w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between p-4 border-b border-aurora-border">
          <h2 className="text-lg font-extrabold text-aurora-primary-dark font-heading">Student Profile</h2>
          <button onClick={onClose} className="p-1 text-aurora-primary-dark/50 hover:text-aurora-primary-dark transition-colors">
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
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="Check-ins" value={student.stats!.count} />
                <StatTile label="Dominant Mood" value={student.stats!.dominantMood} />
                <StatTile label="Avg Stress" value={`${student.stats!.avgStress.toFixed(1)}/10`} />
                <StatTile label="Stability" value={`${student.stats!.stabilityScore}%`} subtext="Variance score" />
              </div>
            ) : (
              <div className="card-aurora p-4 text-center bg-aurora-bg/50">
                <p className="text-sm text-aurora-primary-dark/50">No recent check-in data available.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/counselor/messages')}
            className="w-full btn-aurora flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Message Student
          </button>
        </div>
      </div>
    </div>
  )
}