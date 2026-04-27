import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Shield, BookOpen } from 'lucide-react'

export default function AdminCounselorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-aurora-primary-dark/50 hover:text-aurora-primary-dark transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Counselors
      </button>

      <div className="card-aurora p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-aurora-primary-dark/10 flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-aurora-primary-dark/40" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-aurora-primary-dark">Counselor Profile</h2>
            <p className="text-sm text-aurora-primary-dark/60">ID: {id}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-aurora-secondary-blue/10 text-aurora-secondary-blue border border-aurora-secondary-blue/20">
              Admin View
            </span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card-aurora p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-aurora-accent-purple" />
            <h3 className="text-sm font-bold text-aurora-primary-dark uppercase tracking-wider">Approval Status</h3>
          </div>
          <p className="text-xs text-aurora-primary-dark/60">
            Approval management workflow will be fully integrated with Firebase Auth in Batch 2.
          </p>
        </div>

        <div className="card-aurora p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-aurora-secondary-blue" />
            <h3 className="text-sm font-bold text-aurora-primary-dark uppercase tracking-wider">Student Assignments</h3>
          </div>
          <p className="text-xs text-aurora-primary-dark/60">
            Counselor-to-student mapping and caseload management coming in Batch 2.
          </p>
        </div>
      </div>
    </div>
  )
}