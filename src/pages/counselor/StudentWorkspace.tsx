import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, MessageSquare, Save, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { counselorService } from '../../services/counselor'
import { messagesService } from '../../services/messages'
import { useCounselorNotes } from '../../hooks/useCounselorNotes'
import { LetterAvatar } from '../../components/LetterAvatar'

type TabKey = 'overview' | 'messages' | 'notes'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'messages', label: 'Messages' },
  { key: 'notes', label: 'Notes' },
]

interface StudentLite {
  id: string
  full_name: string
  email?: string
  program?: string
  yearLevel?: string
}

export default function StudentWorkspace() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [student, setStudent] = useState<StudentLite | null>(null)
  const [loadingStudent, setLoadingStudent] = useState(true)
  const [messageBusy, setMessageBusy] = useState(false)

  const { notes, loading: loadingNotes, create, update, remove } = useCounselorNotes(studentId, user?.id)
  const [draftNote, setDraftNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadStudent() {
      if (!studentId) return
      setLoadingStudent(true)
      try {
        const all = await counselorService.getStudents(user?.college_code ?? '')
        if (cancelled) return
        const match = all.find((s) => s.id === studentId)
        setStudent(
          match
            ? {
                id: match.id,
                full_name: match.full_name || 'Student',
                email: match.email,
                program: match.program,
                yearLevel: match.yearLevel,
              }
            : null
        )
      } catch {
        if (!cancelled) setStudent(null)
      } finally {
        if (!cancelled) setLoadingStudent(false)
      }
    }

    void loadStudent()
    return () => {
      cancelled = true
    }
  }, [studentId])

  const subtitle = useMemo(() => {
    const parts = [student?.program, student?.yearLevel].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'Student'
  }, [student?.program, student?.yearLevel])

  const openConversation = async () => {
    if (!student || !user?.id) return
    setMessageBusy(true)
    try {
      const conversationId = await messagesService.createConversation(
        user.id,
        {
          id: student.id,
          name: student.full_name,
          avatar: '',
          program: subtitle,
          isAlerted: false,
        },
        {
          name: user.full_name || 'Counselor',
          avatar: user.avatar_url || '',
        }
      )

      navigate('/counselor/messages', { state: { openConversationId: conversationId } })
    } catch (e) {
      console.error('Failed to open conversation:', e)
      alert('Could not open chat. Please try again.')
    } finally {
      setMessageBusy(false)
    }
  }

  if (loadingStudent) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-aurora-blue" />
        <span className="ml-3 text-[#7B8EC8] text-sm">Loading student workspace...</span>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="card-aurora p-6">
        <h2 className="text-xl font-bold text-white">Student not found</h2>
        <p className="text-sm text-[#7B8EC8] mt-2">This student may not exist or may no longer be accessible.</p>
        <button onClick={() => navigate('/counselor/students')} className="btn-aurora mt-4 cursor-pointer">
          Back to Student Directory
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="card-aurora p-5">
        <div className="flex items-center gap-4">
          <LetterAvatar name={student.full_name} size={56} />
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading truncate">{student.full_name}</h2>
            <p className="text-sm text-[#7B8EC8] truncate">{student.email || subtitle}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-aurora-blue/15 border-aurora-blue/40 text-white'
                  : 'bg-transparent border-white/12 text-[#7B8EC8] hover:border-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="card-aurora p-5 space-y-3">
          <h3 className="text-lg font-bold text-white">Overview</h3>
          <p className="text-sm text-[#7B8EC8]">
            Use this workspace to centralize student context, open direct conversation, and keep counselor notes.
          </p>
          <button onClick={openConversation} disabled={messageBusy} className="btn-aurora cursor-pointer inline-flex items-center gap-2">
            {messageBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Invite to session (open chat)
          </button>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="card-aurora p-5">
          <h3 className="text-lg font-bold text-white mb-2">Messages</h3>
          <p className="text-sm text-[#7B8EC8] mb-4">
            Open or continue the direct thread with this student.
          </p>
          <button onClick={openConversation} disabled={messageBusy} className="btn-aurora cursor-pointer inline-flex items-center gap-2">
            {messageBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Open conversation
          </button>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="card-aurora p-5 space-y-4">
          <h3 className="text-lg font-bold text-white">Counselor Notes</h3>

          <div className="space-y-2">
            <textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              rows={4}
              placeholder="Write a private note for this student..."
              className="w-full rounded-xl border border-white/12 bg-[#121B3D] px-3 py-2 text-sm text-white placeholder:text-[#7B8EC8] outline-none focus:border-aurora-blue"
            />
            <button
              className="btn-aurora cursor-pointer inline-flex items-center gap-2"
              disabled={!draftNote.trim()}
              onClick={async () => {
                await create(draftNote)
                setDraftNote('')
              }}
            >
              <Save className="w-4 h-4" />
              Save note
            </button>
          </div>

          {loadingNotes ? (
            <div className="text-sm text-[#7B8EC8]">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="text-sm text-[#7B8EC8]">No notes yet.</div>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="rounded-xl border border-white/12 bg-[#121B3D] p-3">
                  {editingId === n.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-white/12 bg-[#0D1430] px-3 py-2 text-sm text-white outline-none focus:border-aurora-blue"
                      />
                      <div className="flex gap-2">
                        <button
                          className="btn-aurora cursor-pointer"
                          onClick={async () => {
                            await update(n.id, editingText)
                            setEditingId(null)
                            setEditingText('')
                          }}
                          disabled={!editingText.trim()}
                        >
                          Update
                        </button>
                        <button
                          className="px-3 py-2 rounded-xl border border-white/12 text-sm text-[#7B8EC8] hover:text-white cursor-pointer"
                          onClick={() => {
                            setEditingId(null)
                            setEditingText('')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-white whitespace-pre-wrap">{n.note}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-[#7B8EC8]">
                          Updated {n.updatedAt.toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1.5 rounded-lg border border-white/12 text-xs text-[#7B8EC8] hover:text-white cursor-pointer"
                            onClick={() => {
                              setEditingId(n.id)
                              setEditingText(n.note)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="px-3 py-1.5 rounded-lg border border-red-500/30 text-xs text-red-300 hover:text-red-200 cursor-pointer inline-flex items-center gap-1"
                            onClick={async () => {
                              await remove(n.id)
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}