import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { counselorService } from '../services/counselor'
import { firestoreService } from '../services/firebase-firestore'
import {
  Users, AlertTriangle, MessageSquare,
  Calendar, ChevronRight,
} from 'lucide-react'
import type { RiskLevel } from '../types/risk.types'
import { formatTimeAgo, deriveRiskLevel, getDashboardRiskStyle } from '../utils/riskHelpers'
import { LetterAvatar } from '../components/LetterAvatar'

interface FlagItem {
  id: string
  name: string
  program: string
  time: string
  risk: RiskLevel
}

// Stat Card 
interface StatCardProps {
  icon: React.ReactNode
  count: string | number
  label: string
  accent?: string
}

function StatCard({ icon, count, label, accent }: StatCardProps) {
  return (
    <div className={`card-aurora flex flex-col gap-2 p-5 min-h-[120px] ${accent ?? ''}`}>
      {icon}
      <span className="text-3xl font-extrabold text-aurora-primary-dark tracking-tight">
        {count}
      </span>
      <span className="text-xs text-aurora-primary-dark/60">{label}</span>
    </div>
  )
}

// Flag Row 
function FlagRow({ item }: { item: FlagItem }) {
  const style = getDashboardRiskStyle(item.risk)

  return (
    <Link
      to="/counselor/risk-center"
      className={`flex items-center card-aurora border-l-4 ${style.border} p-0 overflow-hidden hover:shadow-lg transition-shadow`}
      aria-label={`View risk details for ${item.name}`}
    >
      <div className="p-3 pl-4">
        <LetterAvatar name={item.name} size={44} />
      </div>
      <div className="flex-1 py-3">
        <p className="font-bold text-aurora-primary-dark text-sm">{item.name}</p>
        <p className="text-xs text-aurora-primary-dark/50 mt-0.5">
          {item.program} · {item.time}
        </p>
      </div>
      <div className="pr-2">
        <span
          className={`inline-block text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-full border ${style.badgeBg} ${style.badgeBorder} ${style.text}`}
        >
          {item.risk}
        </span>
      </div>
      <ChevronRight className="w-4 h-4 text-aurora-primary-dark/30 mr-3 shrink-0" />
    </Link>
  )
}

// Main 
export default function CounselorDashboard() {
  const { user } = useAuth()
  const [studentCount, setStudentCount] = useState(0)
  const [criticalRisks, setCriticalRisks] = useState(0)
  const [recentFlags, setRecentFlags] = useState<FlagItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const firstName = user?.full_name?.split(' ')[0] || 'Counselor'

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const students = await counselorService.getStudents()
        if (cancelled) return
        setStudentCount(students.length)

        // Fetch recent mood logs for each student (limit 15 for perf)
        const limit = Math.min(15, students.length)
        const studentsWithMood = await Promise.all(
          students.slice(0, limit).map(async (s) => {
            try {
              const logs = await firestoreService.getMoodLogs(s.id)
              const latest = logs[0]
              return {
                student: s,
                stressLevel: latest?.stress_level,
                energyLevel: latest?.energy_level,
                lastLogDate: latest?.log_date,
              }
            } catch {
              return { student: s, stressLevel: undefined, energyLevel: undefined, lastLogDate: undefined }
            }
          })
        )

        if (cancelled) return

        const flags: FlagItem[] = studentsWithMood
          .map(({ student, stressLevel, energyLevel, lastLogDate }) => ({
            id: student.id,
            name: student.full_name || 'Student',
            program: student.email,
            time: lastLogDate ? formatTimeAgo(new Date(lastLogDate)) : 'No logs',
            risk: deriveRiskLevel(stressLevel, energyLevel),
          }))
          .sort((a, b) => {
            const order = { 'HIGH RISK': 0, 'MEDIUM RISK': 1, 'LOW RISK': 2 }
            return (order[a.risk] ?? 2) - (order[b.risk] ?? 2)
          })

        setRecentFlags(flags)
        setCriticalRisks(flags.filter((f) => f.risk === 'HIGH RISK').length)
      } catch (error) {
        console.error('Error fetching counselor dashboard data:', error)
        if (!cancelled) {
          setRecentFlags([])
          setCriticalRisks(0)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-primary-dark/40 uppercase">
          Counselor Portal
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading mt-1">
          Hello, {firstName}
        </h2>
      </div>

      {/* Stat Cards */}
      <div>
        <h3 className="text-lg font-extrabold text-aurora-primary-dark mb-3 font-heading">
          Dashboard Overview
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={
              <div className="w-9 h-9 rounded-full bg-aurora-secondary-blue/15 flex items-center justify-center">
                <Users className="w-[18px] h-[18px] text-aurora-secondary-blue" />
              </div>
            }
            count={studentCount}
            label="Total Students"
          />
          <StatCard
            icon={
              <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="w-[18px] h-[18px] text-red-500" />
              </div>
            }
            count={criticalRisks}
            label="Critical Risks"
            accent="ring-1 ring-red-500/20"
          />
          <StatCard
            icon={
              <div className="relative w-9 h-9 rounded-full bg-aurora-secondary-blue/10 flex items-center justify-center">
                <MessageSquare className="w-[18px] h-[18px] text-aurora-secondary-blue" />
                <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-aurora-secondary-blue" />
              </div>
            }
            count={3}
            label="New Messages"
          />
          <StatCard
            icon={
              <div className="w-9 h-9 rounded-full bg-amber-400/10 flex items-center justify-center">
                <Calendar className="w-[18px] h-[18px] text-amber-500" />
              </div>
            }
            count={8}
            label="Pending Follow-ups"
          />
        </div>
      </div>

      {/* Recent Flags */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-extrabold text-aurora-primary-dark font-heading">
            Recent Flags
          </h3>
          <Link
            to="/counselor/risk-center"
            className="flex items-center gap-1 text-aurora-secondary-blue text-xs font-bold hover:underline"
          >
            VIEW ALL
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-secondary-blue" />
            <span className="ml-3 text-aurora-primary-dark/50 text-sm">Loading...</span>
          </div>
        ) : recentFlags.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-aurora-primary-dark/20 mx-auto mb-3" />
            <p className="text-aurora-primary-dark/50 text-sm">No student flags to display.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentFlags.map((item) => (
              <FlagRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}