import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { sessionsService } from '../../services/sessions'
import { counselorService } from '../../services/counselor'
import { SessionCard } from '../../components/sessions/SessionCard'
import type { Session, SessionStatus } from '../../types/session.types'
import type { StudentInfo } from '../../services/counselor'
import { Search, Loader2 } from 'lucide-react'

const FILTERS: { label: string; value: 'all' | SessionStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Missed', value: 'missed' },
]

export default function SessionHistory() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [studentsMap, setStudentsMap] = useState<Record<string, StudentInfo>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | SessionStatus>('all')

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      try {
        const [fetchedSessions, fetchedStudents] = await Promise.all([
          sessionsService.getSessionsForCounselor(user.id),
          counselorService.getStudents()
        ])
        setSessions(fetchedSessions)
        
        const map: Record<string, StudentInfo> = {}
        fetchedStudents.forEach(s => {
          map[s.id] = s
        })
        setStudentsMap(map)
      } catch (error) {
        console.error('Failed to load session history:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const studentName = studentsMap[session.studentId]?.full_name || 'Unknown Student'
      const matchesSearch = studentName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || session.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [sessions, studentsMap, searchQuery, statusFilter])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-aurora-blue animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-white">Session History</h1>
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-aurora-text-muted" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name..."
            className="w-full bg-aurora-card border border-aurora-border rounded-[14px] py-3.5 pl-12 pr-4 text-white placeholder-aurora-text-muted focus:outline-none focus:border-aurora-blue/50"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {FILTERS.map((filter) => {
            const isActive = statusFilter === filter.value
            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-[12px] text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-aurora-blue/15 text-aurora-blue border border-aurora-blue/40'
                    : 'bg-aurora-card border border-aurora-border text-aurora-text-sec hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      {filteredSessions.length === 0 ? (
        <div className="card-aurora flex flex-col items-center justify-center py-16">
          <p className="text-aurora-text-sec font-semibold">No sessions found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              peerName={studentsMap[session.studentId]?.full_name || 'Unknown Student'}
            />
          ))}
        </div>
      )}
    </div>
  )
}