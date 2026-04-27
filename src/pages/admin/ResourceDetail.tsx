import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, CheckCircle, Settings } from 'lucide-react'

export default function AdminResourceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-aurora-primary-dark/50 hover:text-aurora-primary-dark transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Resources
      </button>

      <div className="card-aurora p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between border-l-4 border-l-aurora-secondary-blue">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-aurora-primary-dark/10 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-aurora-primary-dark/40" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-aurora-primary-dark">Resource Content</h2>
            <p className="text-sm text-aurora-primary-dark/60">ID: {id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/20">
            DRAFT
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card-aurora p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-bold text-aurora-primary-dark uppercase tracking-wider">Review & Publish</h3>
          </div>
          <p className="text-xs text-aurora-primary-dark/60">
            Content moderation and publishing workflow will be implemented in Batch 2.
          </p>
        </div>

        <div className="card-aurora p-5">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-aurora-primary-dark/50" />
            <h3 className="text-sm font-bold text-aurora-primary-dark uppercase tracking-wider">Metadata</h3>
          </div>
          <p className="text-xs text-aurora-primary-dark/60">
            Tagging, categorization, and targeting options coming in Batch 2.
          </p>
        </div>
      </div>
    </div>
  )
}