import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Activity, Clock } from 'lucide-react'

export default function AdminStudentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-aurora-primary-dark/50 hover:text-aurora-primary-dark transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Students
      </button>

      <div className="card-aurora p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-aurora-primary-dark/10 flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-aurora-primary-dark/40" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-aurora-primary-dark">Student Profile</h2>
            <p className="text-sm text-aurora-primary-dark/60">ID: {id}</p>
          </div>
        </div>
        <button className="btn-aurora text-sm py-2 px-4">Edit Profile</button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card-aurora p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-aurora-primary-dark uppercase tracking-wider">Mood Status</h3>
          </div>
          <p className="text-xs text-aurora-primary-dark/60">
            Aggregated mood logs and risk signals will be visible here in Batch 2.
          </p>
        </div>

        <div className="card-aurora p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-aurora-secondary-blue" />
            <h3 className="text-sm font-bold text-aurora-primary-dark uppercase tracking-wider">Check-in History</h3>
          </div>
          <p className="text-xs text-aurora-primary-dark/60">
            Complete historical timeline of student interactions coming in Batch 2.
          </p>
        </div>
      </div>
    </div>
  )
}