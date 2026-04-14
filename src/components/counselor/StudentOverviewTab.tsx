import { User, Calendar } from 'lucide-react'
import { formatTimeAgo } from '../../utils/riskHelpers'

interface StudentOverviewTabProps {
  student: any
  moodLogs: any[]
}

export function StudentOverviewTab({ student, moodLogs }: StudentOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student Info Card */}
        <div className="card-aurora p-5">
          <h3 className="text-sm font-bold text-aurora-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="w-4 h-4" /> Student Profile
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between border-b border-white/8 pb-2">
              <span className="text-aurora-primary-dark/60 text-sm">Role</span>
              <span className="font-semibold text-aurora-primary-dark text-sm capitalize">
                {student.role || 'Student'}
              </span>
            </div>
            <div className="flex justify-between border-b border-white/8 pb-2">
              <span className="text-aurora-primary-dark/60 text-sm">Year Level</span>
              <span className="font-semibold text-aurora-primary-dark text-sm">
                {student.yearLevel || '1st Year'}
              </span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-aurora-primary-dark/60 text-sm">Account Status</span>
              <span className="font-semibold text-aurora-green text-sm">Active</span>
            </div>
          </div>
        </div>

        {/* Mood Logs Card */}
        <div className="card-aurora p-5">
          <h3 className="text-sm font-bold text-aurora-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Recent Mood Logs
          </h3>
          {moodLogs.length === 0 ? (
            <p className="text-sm text-aurora-gray-400">No mood logs recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {moodLogs.slice(0, 3).map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-aurora-gray-50 border border-aurora-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {log.emotions?.[0] === 'Joy'
                        ? '😊'
                        : log.emotions?.[0] === 'Sadness'
                          ? '😢'
                          : '😐'}
                    </span>
                    <div>
                      <p className="font-bold text-sm text-aurora-primary-dark">
                        {log.emotions?.join(', ') || 'Logged Mood'}
                      </p>
                      <p className="text-xs text-aurora-gray-500 truncate max-w-[150px]">
                        {log.note || 'No notes'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-aurora-gray-400">
                    {formatTimeAgo(new Date(log.log_date))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}