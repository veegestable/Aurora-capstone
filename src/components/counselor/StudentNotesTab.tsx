interface StudentNotesTabProps {
  studentName: string
  notes: string
  isSavingNote: boolean
  onNotesChange: (notes: string) => void
  onSaveNotes: () => void
}

export function StudentNotesTab({
  studentName,
  notes,
  isSavingNote,
  onNotesChange,
  onSaveNotes,
}: StudentNotesTabProps) {
  return (
    <div className="card-aurora p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-aurora-primary-dark font-heading">
          Private Counselor Notes
        </h3>
        <p className="text-sm text-aurora-gray-500 mt-1">
          These notes are encrypted and only visible to you. The student cannot see them.
        </p>
      </div>

      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder={`Write your observations or session notes for ${studentName} here...`}
        className="w-full h-64 p-4 rounded-xl border border-white/8 bg-aurora-card-dark focus:bg-aurora-card focus:border-aurora-blue outline-none resize-none transition-colors text-white placeholder:text-aurora-text-muted"
      />

      <div className="flex justify-end pt-2">
        <button
          onClick={onSaveNotes}
          disabled={isSavingNote}
          className="btn-aurora px-8 cursor-pointer disabled:opacity-50"
        >
          {isSavingNote ? 'Saving...' : 'Save Notes'}
        </button>
      </div>
    </div>
  )
}