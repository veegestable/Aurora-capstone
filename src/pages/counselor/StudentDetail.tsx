import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../services/firebase-firestore/db'
import { useAuth } from '../../contexts/AuthContext'
import { firestoreService } from '../../services/firebase-firestore'
import { deriveRiskLevel, getStudentRiskStyle } from '../../utils/riskHelpers'
import { ArrowLeft, Activity, MessageSquare, FileText } from 'lucide-react'
import { LetterAvatar } from '../../components/LetterAvatar'
import { DirectMessageView } from '../../components/messages/DirectMessageView'
import { StudentOverviewTab } from '../../components/counselor/StudentOverviewTab'
import { StudentNotesTab } from '../../components/counselor/StudentNotesTab'
import type { RiskLevel } from '../../types/risk.types'

type TabType = 'Overview' | 'Messages' | 'Notes'

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<TabType>('Overview')
  const [student, setStudent] = useState<any>(null)
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('LOW RISK')
  const [moodLogs, setMoodLogs] = useState<any[]>([])
  const [notes, setNotes] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 1. Fetch Student Data, Moods, and Saved Notes
  useEffect(() => {
    if (!id || !user?.id) return

    async function loadData() {
      try {
        const userDoc = await getDoc(doc(db, 'users', id!))
        if (userDoc.exists()) setStudent(userDoc.data())

        // FIX #1: access it from counselorService
        const logs = await firestoreService.getMoodLogs(id!)
        setMoodLogs(logs)
        if (logs.length > 0) {
          setRiskLevel(deriveRiskLevel(logs[0].stress_level, logs[0].energy_level))
        }

        const notesQuery = query(
          collection(db, 'counselor_notes'),
          where('counselor_id', '==', user!.id),
          where('student_id', '==', id)
        )
        const notesSnap = await getDocs(notesQuery)
        if (!notesSnap.empty) {
          setNotes(notesSnap.docs[0].data().note_text || '')
        }
      } catch (error) {
        console.error('Error loading student details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [id, user?.id])

  // 2. Save Notes directly to Firestore
  const handleSaveNotes = async () => {
    if (!id || !user?.id) return
    setIsSavingNote(true)
    try {
      const noteDocRef = doc(db, 'counselor_notes', `${user.id}_${id}`)
      await setDoc(noteDocRef, {
        counselor_id: user.id,
        student_id: id,
        note_text: notes,
        updated_at: serverTimestamp(),
      }, { merge: true })

      alert('Note saved successfully!')
    } catch (error) {
      console.error('Failed to save note:', error)
      alert('Failed to save note.')
    } finally {
      setIsSavingNote(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-secondary-blue" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-aurora-primary-dark">Student not found.</h2>
        <button
          onClick={() => navigate('/counselor/students')}
          className="mt-4 text-aurora-secondary-blue hover:underline cursor-pointer"
        >
          Go back to directory
        </button>
      </div>
    )
  }

  const riskStyle = getStudentRiskStyle(riskLevel)

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-aurora-gray-200 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-aurora-gray-100 transition-colors w-max cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-aurora-gray-600" />
        </button>

        <LetterAvatar name={student.full_name || student.email} size={64} />

        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading">
            {student.full_name || 'Unknown Student'}
          </h2>
          <p className="text-sm font-bold text-aurora-primary-dark/60 mt-1">
            {student.email} • {student.program || 'BSCS'}
          </p>
        </div>

        <div className="shrink-0 flex items-center justify-center">
          <span
            className={`px-4 py-1.5 rounded-full border text-sm font-extrabold tracking-wide ${riskStyle.badgeBg} ${riskStyle.badgeBorder} ${riskStyle.text}`}
          >
            {riskLevel}
          </span>
        </div>
      </div>

      {/* 2. Custom Aurora Tabs */}
      <div className="flex gap-2 border-b border-aurora-gray-200 pb-px">
        {[
          { id: 'Overview', icon: Activity },
          { id: 'Messages', icon: MessageSquare },
          { id: 'Notes', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 cursor-pointer
                ${
                  isActive
                    ? 'border-aurora-secondary-blue text-aurora-secondary-blue'
                    : 'border-transparent text-aurora-gray-500 hover:text-aurora-primary-dark'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.id}
            </button>
          )
        })}
      </div>

      {/* 3. Tab Content */}
      <div className="pt-2">
        {activeTab === 'Overview' && (
          <StudentOverviewTab student={student} moodLogs={moodLogs} />
        )}

        {activeTab === 'Messages' && (
          <div className="card-aurora p-0 overflow-hidden relative min-h-[500px]">
            <DirectMessageView
              contact={{
                // FIX #3: provide empty string fallback for string typing
                id: id ?? '',
                conversationId: `${user?.id}_${id}`,
                name: student.full_name || student.email,
                preview: '',
                time: '',
                avatar: '',
                isOnline: false,
                isUnread: false,
              }}
              onBack={() => setActiveTab('Overview')}
            />
          </div>
        )}

        {activeTab === 'Notes' && (
          <StudentNotesTab
            studentName={student.full_name || 'this student'}
            notes={notes}
            isSavingNote={isSavingNote}
            onNotesChange={setNotes}
            onSaveNotes={handleSaveNotes}
          />
        )}
      </div>
    </div>
  )
}
