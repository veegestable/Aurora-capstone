import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import {
  ArrowLeft, Mail, Phone, CircleHelp, Loader2, MessageSquare, X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { messagesService } from '../../services/messages'
import { counselorCheckInContextService } from '../../services/counselor-checkin-context'
import { sessionsService } from '../../services/sessions'
import { LetterAvatar } from '../../components/LetterAvatar'
import { JournalCalendar } from '../../components/journal/JournalCalendar'
import { CounselorLast7MoodBars } from '../../components/counselor/CounselorLast7MoodBars'
import { formatCounselorStudentSubtitle } from '../../constants/student/programs'

interface StudentDoc {
  full_name?: string
  email?: string
  contact_number?: string
  department?: string
  program?: string
  year_level?: string
  avatar_url?: string
}

const SPECIAL_POP_INFO =
  "This student unlocked full check-in detail for you. The calendar and charts below mirror what they see in Aurora, including notes and wellness fields. There is no in-app way for them to revoke this yet."

const MOOD_ONLY_INFO =
  "You can see each check-in's date, time, and mood label below — not notes, sleep, meals, bath, or photos. Full journal and week charts unlock when this student is in your special population (they sent you a session request, or they accepted a session time you proposed)."

function OutcomeTile({
  label,
  value,
  caption,
}: { label: string; value: number; caption: string }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold tracking-wider text-aurora-text-muted uppercase mb-1.5">
        {label}
      </p>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[11px] text-aurora-text-sec mt-1">{caption}</p>
    </div>
  )
}

export default function CounselorStudentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [student, setStudent] = useState<StudentDoc | null>(null)
  const [studentLoading, setStudentLoading] = useState(true)
  const [contextLoading, setContextLoading] = useState(true)
  const [journalAccessGranted, setJournalAccessGranted] = useState(false)
  const [outcomeCounts, setOutcomeCounts] = useState({ completed: 0, missed: 0 })
  const [inviteBusy, setInviteBusy] = useState(false)
  const [showAccessHint, setShowAccessHint] = useState(false)

  useEffect(() => {
    if (!id) {
      setStudentLoading(false)
      setStudent(null)
      return
    }
    let cancelled = false
    setStudentLoading(true)
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'users', id))
        if (cancelled) return
        setStudent(snap.exists() ? (snap.data() as StudentDoc) : null)
      } catch {
        if (!cancelled) setStudent(null)
      } finally {
        if (!cancelled) setStudentLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!id || !user?.id) {
      setContextLoading(false)
      return
    }
    let cancelled = false
    setContextLoading(true)
    ;(async () => {
      try {
        const ctx = await counselorCheckInContextService
          .fetchStudentCounselorDetailedContext(id, user.id)
        if (cancelled) return
        setJournalAccessGranted(ctx.journalAccessGranted)
        if (ctx.journalAccessGranted) {
          const counts = await sessionsService
            .getSessionOutcomeCountsForCounselorStudent(user.id, id)
          if (!cancelled) setOutcomeCounts(counts)
        } else {
          setOutcomeCounts({ completed: 0, missed: 0 })
        }
      } catch {
        if (!cancelled) {
          setJournalAccessGranted(false)
          setOutcomeCounts({ completed: 0, missed: 0 })
        }
      } finally {
        if (!cancelled) setContextLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, user?.id])

  if (!id) {
    return <p className="text-sm text-aurora-text-muted">Missing student id.</p>
  }

  const fullName = student?.full_name?.trim() || 'Student'
  const programLine =
    formatCounselorStudentSubtitle({
      department: student?.department,
      program: student?.program,
      year_level: student?.year_level,
    }) || 'CCS'
  const email = student?.email?.trim()
  const contact = student?.contact_number?.trim()

  const handleInvite = async () => {
    if (!user?.id || !id || !student) return
    setInviteBusy(true)
    try {
      await messagesService.createConversation(
        user.id,
        { id, name: fullName, isAlerted: false, borderColor: undefined },
        { name: user.full_name || 'Counselor', avatar: user.avatar_url || '' },
      )
      navigate('/counselor/messages')
    } catch (e) {
      console.error('Failed to start chat:', e)
      alert('Could not start chat. Please try again in a moment.')
    } finally {
      setInviteBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <button
        type="button"
        onClick={() => navigate('/counselor/students')}
        className="flex items-center gap-2 text-sm font-semibold text-aurora-text-sec hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to directory
      </button>

      {studentLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-aurora-blue" />
        </div>
      ) : !student ? (
        <p className="text-sm text-aurora-text-muted">Could not load this student.</p>
      ) : (
        <>
          {/* Profile card */}
          <div className="card-aurora flex items-center gap-4">
            <LetterAvatar
              name={fullName}
              size={64}
              avatarUrl={student.avatar_url ?? undefined}
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white font-heading truncate">
                {fullName}
              </h1>
              <p className="text-sm text-aurora-text-sec mt-0.5 line-clamp-2">{programLine}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Mail className="w-3.5 h-3.5 text-[#BFD2FF] shrink-0" />
                <span className="text-xs text-[#C9D8FF] truncate">
                  {email || 'No email provided'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5 text-[#BFD2FF] shrink-0" />
                <span className="text-xs text-[#C9D8FF] truncate">
                  {contact || 'No contact number'}
                </span>
              </div>
            </div>
          </div>

          {/* Invite to Session */}
          <button
            type="button"
            onClick={handleInvite}
            disabled={inviteBusy}
            className="w-full max-w-md btn-aurora flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {inviteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Invite to Session
          </button>

          <p className="text-xs text-aurora-text-muted leading-relaxed">
            Baseline view for every student; full journal only for your special population
            after session consent flows above.
          </p>

          {/* Special Population / Mood-only card */}
          {contextLoading ? (
            <div className="card-aurora flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-aurora-blue" />
            </div>
          ) : journalAccessGranted ? (
            <div className="card-aurora">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-base font-extrabold text-white">Special Population</p>
                <button
                  type="button"
                  onClick={() => setShowAccessHint(true)}
                  aria-label="Special population info"
                  className="p-1 cursor-pointer hover:opacity-70 transition-opacity"
                >
                  <CircleHelp className="w-4 h-4 text-aurora-text-sec" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-aurora-border">
                <OutcomeTile
                  label="Completed Sessions"
                  value={outcomeCounts.completed}
                  caption="Marked completed in Session History"
                />
                <OutcomeTile
                  label="Missed Sessions"
                  value={outcomeCounts.missed}
                  caption="No-show or marked missed"
                />
              </div>
            </div>
          ) : (
            <div className="card-aurora">
              <div className="flex items-center gap-2">
                <p className="text-base font-extrabold text-white">Mood check-ins</p>
                <button
                  type="button"
                  onClick={() => setShowAccessHint(true)}
                  aria-label="Mood check-ins info"
                  className="p-1 cursor-pointer hover:opacity-70 transition-opacity"
                >
                  <CircleHelp className="w-4 h-4 text-aurora-text-sec" />
                </button>
              </div>
            </div>
          )}

          {/* Last 7 (only with full access) */}
          {!contextLoading && journalAccessGranted && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-white">Last 7 days</h2>
              <CounselorLast7MoodBars studentId={id} />
            </div>
          )}

          {/* Calendar (always; baseline mode if no access) */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-white">Mood journal</h2>
            <JournalCalendar
              forUserId={id}
              privacyMode={journalAccessGranted ? 'full' : 'baseline'}
            />
          </div>
        </>
      )}

      {/* Hint modal */}
      {showAccessHint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAccessHint(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-aurora-card border border-aurora-border rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-base font-extrabold text-white">
                {journalAccessGranted ? 'Special Population' : 'Mood check-ins'}
              </p>
              <button
                type="button"
                onClick={() => setShowAccessHint(false)}
                aria-label="Close"
                className="p-1 cursor-pointer hover:opacity-70 transition-opacity"
              >
                <X className="w-4 h-4 text-aurora-text-sec" />
              </button>
            </div>
            <p className="text-sm text-aurora-text-sec leading-relaxed">
              {journalAccessGranted ? SPECIAL_POP_INFO : MOOD_ONLY_INFO}
            </p>
            <button
              type="button"
              onClick={() => setShowAccessHint(false)}
              className="mt-5 w-full py-2.5 rounded-xl border border-aurora-border bg-aurora-card-alt text-sm font-bold text-white hover:bg-aurora-card-alt/70 transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}