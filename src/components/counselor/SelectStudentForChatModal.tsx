import { useEffect, useMemo, useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { LetterAvatar } from '../LetterAvatar'
import { counselorService } from '../../services/counselor'
import type { StudentInfo } from '../../services/counselor'
import { useAuth } from '../../contexts/AuthContext'

interface SelectStudentForChatModalProps {
  open: boolean
  onClose: () => void
  onSelect: (student: StudentInfo) => void
}

export function SelectStudentForChatModal({
  open,
  onClose,
  onSelect,
}: SelectStudentForChatModalProps) {
  const { user } = useAuth()
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open || !user?.id) return
    let cancelled = false
    setLoading(true)
    counselorService
      .getStudentsForCounselor(user.id, {
        activeCollegeCode: user.college_code,
      })
      .then((s) => { if (!cancelled) setStudents(s) })
      .catch(() => { if (!cancelled) setStudents([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, user?.id, user?.college_code])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) =>
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q),
    )
  }, [students, search])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg card-aurora border border-aurora-border p-6 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Add student</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-white/5 text-aurora-text-sec transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-aurora-text-muted" />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID or program..."
            className="w-full bg-aurora-card-alt border border-aurora-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-aurora-text-muted focus:outline-none focus:border-aurora-blue/50"
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-aurora-blue" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-aurora-text-muted py-10">
              {students.length === 0 ? 'No students yet.' : 'No students match that search.'}
            </p>
          ) : (
            <ul className="space-y-1 px-2">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(s)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left"
                  >
                    <LetterAvatar name={s.full_name} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{s.full_name}</p>
                      <p className="text-xs text-aurora-text-muted truncate">{s.email}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}