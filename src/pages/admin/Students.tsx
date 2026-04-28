import { useState, useEffect, useMemo } from 'react'
import { adminService, type AdminStudentUser } from '../../services/admin'
import { LetterAvatar } from '../../components/LetterAvatar'
import { Users, Search, RefreshCw } from 'lucide-react'

export default function AdminStudents() {
  const [students, setStudents] = useState<AdminStudentUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const loadStudents = async () => {
    setLoading(true)
    try {
      setStudents(await adminService.getStudents())
    } catch (error) {
      console.error('Failed to load students:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStudents() }, [])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase()
    return students.filter(s => 
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.student_number?.toLowerCase().includes(q)
    )
  }, [students, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-primary-dark/40 uppercase">Admin</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading mt-1">
            Students
          </h2>
        </div>
        <button
          onClick={loadStudents}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-aurora-secondary-blue hover:bg-aurora-secondary-blue/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Refresh student list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2.5 card-aurora rounded-full! py-2.5! px-4!">
        <Search className="w-[18px] h-[18px] text-aurora-primary-dark/40 shrink-0" />
        <input
          type="text"
          placeholder="Search name, email, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-aurora-primary-dark placeholder:text-aurora-primary-dark/40 outline-none"
          aria-label="Search students"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-secondary-blue" />
          <span className="ml-3 text-aurora-primary-dark/50 text-sm">Loading students...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-aurora-primary-dark/20 mx-auto mb-3" />
          <p className="text-aurora-primary-dark/50 text-sm">
            {searchQuery ? 'No students found matching your search.' : 'No students registered yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="card-aurora p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt={s.full_name} className="w-[44px] h-[44px] rounded-full object-cover shrink-0 border border-white/8" />
                ) : (
                  <LetterAvatar name={s.full_name || 'Student'} size={44} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-aurora-primary-dark text-sm truncate">
                    {s.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-aurora-primary-dark/50 truncate">{s.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-aurora-primary-dark/70">
                  {s.student_number || 'No ID'}
                </p>
                <p className="text-[10px] uppercase font-bold text-aurora-primary-dark/40 mt-0.5">
                  {[s.department, s.year_level].filter(Boolean).join(' · ') || 'No program'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}