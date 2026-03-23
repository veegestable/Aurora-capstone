import { Link } from 'react-router-dom'
import { LetterAvatar } from '../LetterAvatar'
import { getStudentRiskStyle } from '../../utils/riskHelpers'
import type { RiskLevel } from '../../types/risk.types'

export interface StudentEntry {
  id: string
  full_name: string
  email: string
  department?: string
  year_level?: string
  riskLevel: RiskLevel
  moodEmoji: string
  lastLog: string
}

export function StudentCard({ student }: { student: StudentEntry }) {
  const style = getStudentRiskStyle(student.riskLevel)
  return (
    <Link 
      to={`/counselor/students/${student.id}`}
      className={`flex items-center card-aurora border-l-4 ${style.border} p-0 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 block w-full outline-hidden focus:ring-2 focus:ring-aurora-secondary-blue/50`}
    >
      {/* Avatar */}
      <div className="p-3 pl-4">
        <div className={`rounded-full ring-2 ${style.ring}`}>
          <LetterAvatar name={student.full_name} size={52} />
        </div>
      </div>
      
      {/* Info */}
      <div className="flex-1 py-3 min-w-0">
        <p className="font-bold text-aurora-primary-dark text-sm truncate">
          {student.full_name}
        </p>
        <p className="text-[11px] font-bold tracking-wide text-aurora-primary-dark/50 mt-0.5">
          {student.email}
        </p>
        <div className="flex items-center justify-between mt-2 pr-2">
          <span
            className={`text-[10px] font-extrabold tracking-wide px-2 py-0.5 rounded-lg border ${style.badgeBg} ${style.badgeBorder} ${style.text}`}
          >
            {student.riskLevel}
          </span>
          <span className="text-aurora-primary-dark/40 text-[11px]">
            Last log: {student.lastLog}
          </span>
        </div>
      </div>
      
      {/* Mood Emoji */}
      <span className="text-xl mr-4 shrink-0">{student.moodEmoji}</span>
      
      {/* Navigation Arrow */}
      <div className="pr-4 shrink-0">
        <div className="w-8 h-8 rounded-full bg-aurora-gray-100 flex items-center justify-center text-aurora-gray-500 transition-colors group-hover:bg-aurora-secondary-blue group-hover:text-white">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>
    </Link>
  )
}