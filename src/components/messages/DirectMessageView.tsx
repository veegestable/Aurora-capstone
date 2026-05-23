import { useState, useEffect, useRef } from 'react'
import type { SessionRequestFormData } from '../sessions/StudentSessionRequestModal'
import { StudentSessionRequestModal } from '../sessions/StudentSessionRequestModal'
import { useAuth } from '../../contexts/AuthContext'
import { messagesService } from '../../services/messages'
import { auditLogsService } from '../../services/audit-logs'
import { sessionsService } from '../../services/sessions'
import { LetterAvatar } from '../LetterAvatar'
import { ChatBubble } from './ChatBubble'
import { ConversationReadOnlyBanner } from './ConversationReadOnlyBanner'
import { SendSessionInviteModal } from '../counselor/SendSessionInviteModal'
import { SessionChatDetailsModal } from '../counselor/SessionChatDetailsModal'
import { SessionAttendanceModal, type AttendanceStatus } from '../counselor/SessionAttendanceModal'
import { Calendar, ArrowLeft, Send, CalendarPlus } from 'lucide-react'
import type {
  CounselorContact,
  StudentContact,
  ChatMessage,
  SessionMessage,
  SessionRequestMessage,
} from '../../types/message.types'
import { usePeerPresence } from '../../hooks/usePeerPresence'
import { isOpenSessionRequestExpired } from '../../utils/dateHelpers'

interface DirectMessageViewProps {
  contact: CounselorContact | StudentContact
  onBack: () => void
  autoOpenSessionRequestModal?: boolean
}

export function DirectMessageView({
  contact,
  onBack,
  autoOpenSessionRequestModal = false,
}: DirectMessageViewProps) {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [showSessionRequestModal, setShowSessionRequestModal] = useState(false)
  const [detailsTarget, setDetailsTarget] = useState<SessionMessage | null>(null)
  const [proposeSessionId, setProposeSessionId] = useState<string | null>(null)
  const [proposeFlow, setProposeFlow] = useState<'student_request' | 'reschedule' | null>(null)
  const [attendanceTarget, setAttendanceTarget] = useState<SessionMessage | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const openedSessionRequestByParamRef = useRef(false)
  const peerOnline = usePeerPresence(contact.id)
  const isOnline = peerOnline || contact.isOnline
  const messagingClosed =
    'messagingClosed' in contact &&
    !!(contact.messagingClosed || contact.isPastCollege)
  const viewerRole = user?.role === 'counselor' ? 'counselor' : 'student'

  const refreshMessages = () => {
    if (!contact.conversationId || !user?.id) return
    messagesService
      .getMessagesForStudent(contact.conversationId, user.id)
      .then(setMessages)
      .catch(() => setMessages([]))
  }

  useEffect(() => {
    if (!contact.conversationId || !user?.id) {
      setIsLoadingMessages(false)
      return
    }

    let isCancelled = false
    messagesService.markConversationAsRead(contact.conversationId, user.id)
    messagesService
      .getMessagesForStudent(contact.conversationId, user.id)
      .then((msgs) => {
        if (!isCancelled) setMessages(msgs)
      })
      .catch(() => {
        if (!isCancelled) setMessages([])
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingMessages(false)
      })

    return () => { isCancelled = true }
  }, [contact.conversationId, user?.id])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    openedSessionRequestByParamRef.current = false
  }, [contact.conversationId])

  useEffect(() => {
    if (!autoOpenSessionRequestModal) return
    if (openedSessionRequestByParamRef.current) return
    if (user?.role === 'counselor') return
    openedSessionRequestByParamRef.current = true
    setShowSessionRequestModal(true)
  }, [autoOpenSessionRequestModal, user?.role, contact.conversationId])

  const handleSendSessionRequest = async (data: SessionRequestFormData) => {
    if (!user?.id || !contact.conversationId || isSending || messagingClosed) return
    if (user.role === 'counselor') return

    setIsSending(true)
    try {
      await sessionsService.sendSessionRequestFromConversation({
        conversationId: contact.conversationId,
        studentId: user.id,
        counselorId: contact.id,
        preferredDate: data.preferredDate,
        note: data.note,
      })
      setShowSessionRequestModal(false)
      refreshMessages()
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }, 300)
    } catch (e) {
      console.error('Failed to send session request:', e)
      alert(e instanceof Error ? e.message : 'Failed to send request. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleSend = async () => {
    const text = message.trim()
    if (!text || !user?.id || !contact.conversationId || isSending || messagingClosed) return

    setIsSending(true)
    try {
      const msgId = await messagesService.sendTextMessage(
        contact.conversationId,
        user.id,
        text,
      )
      setMessages((prev) => [
        ...prev,
        { id: msgId, senderId: 'me', type: 'text', text, time: 'Just now' },
      ])
      setMessage('')
      auditLogsService.writeAuditLog({
        performedBy: user.id,
        performedByRole: user.role ?? 'unknown',
        action: 'message_sent',
        targetType: 'conversation',
        targetId: contact.conversationId,
      })
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleConfirmSession = async (
    sessionId: string,
    slot: { date: string; time: string },
  ) => {
    if (!user?.id || !contact.conversationId || isSending) return
    if (!sessionId || sessionId.startsWith('session_')) {
      alert('This invite is missing a valid session link.')
      return
    }

    setIsSending(true)
    try {
      await sessionsService.studentConfirmFinalSlot(
        sessionId,
        user.id,
        slot,
        {
          conversationId: contact.conversationId,
          counselorId: contact.id,
        },
      )

      setMessages((prev) =>
        prev.map((m) => {
          if (m.type === 'session' && m.session.id === sessionId) {
            return {
              ...m,
              session: { ...m.session, sessionStatus: 'confirmed', agreedSlot: slot },
            }
          }
          return m
        }),
      )

      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      }, 100)
    } catch (e: unknown) {
      console.error('Failed to confirm session time:', e)
      alert('Could not confirm session: ' + (e instanceof Error ? e.message : 'Please try again.'))
    } finally {
      setIsSending(false)
    }
  }

  const handleViewDetails = (msg: SessionMessage) => {
    setDetailsTarget(msg)
  }

  function parsePreferredTimeToSlot(preferredTime: string): { date: string; time: string } {
    const normalized = preferredTime.replace(/\s+at\s+/i, ', ')
    const parts = normalized.split(', ')
    if (parts.length < 2) return { date: preferredTime, time: '' }
    const time = parts[parts.length - 1]
    const date = parts.slice(0, -1).join(', ')
    return { date, time }
  }

  function resolveSessionDocId(msg: SessionMessage): string | null {
    const id = msg.session.id
    if (!id || id.startsWith('session_')) return null
    return id
  }

  const handleAcceptSessionRequest = async (msg: SessionRequestMessage) => {
    if (!user?.id || !contact.conversationId || isSending || messagingClosed) return
    const sessionId = msg.sessionRequest.sessionId
    const preferredTime = msg.sessionRequest.preferredTime
    if (!sessionId || !preferredTime) return
    if (
      isOpenSessionRequestExpired({
        status: msg.sessionRequest.status,
        preferredTime,
        requestedAtMs: msg.sessionRequest.requestedAtMs,
      })
    ) {
      alert(
        'This session request can no longer be accepted because 24 hours have passed without a response, or the preferred time has already passed.',
      )
      return
    }
    setIsSending(true)
    try {
      const slot = parsePreferredTimeToSlot(preferredTime)
      await sessionsService.acceptStudentSessionRequest(
        contact.conversationId,
        sessionId,
        slot,
        user.id,
        contact.id,
      )
      refreshMessages()
    } catch (e) {
      console.error('Failed to accept session request:', e)
      alert(e instanceof Error ? e.message : 'Could not accept request. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleProposeSessionRequest = (msg: SessionRequestMessage) => {
    const sessionId = msg.sessionRequest.sessionId
    if (!sessionId) return
    setProposeFlow('student_request')
    setProposeSessionId(sessionId)
  }

  const handleReschedule = (msg: SessionMessage) => {
    const id = resolveSessionDocId(msg)
    if (!id) {
      alert('This invite is missing a valid session link.')
      return
    }
    setProposeFlow('reschedule')
    setProposeSessionId(id)
  }

  const handleProposeSlotsFromModal = async (slots: Array<{ date: string; time: string }>, note: string) => {
    if (!user?.id || !contact.conversationId || !proposeSessionId || isSending) return
    setIsSending(true)
    try {
      const firstName = contact.name.split(' ')[0] || 'there'
      const lead =
        proposeFlow === 'student_request'
          ? `Hi ${firstName}, here are some schedules that work on my side. Please tap the session card below and choose one that fits you.`
          : undefined
      await sessionsService.proposeSlots(proposeSessionId, slots, {
        conversationId: contact.conversationId,
        counselorId: user.id,
        studentId: contact.id,
        counselorName: user.full_name || 'Counselor',
        note,
        proposalKind: proposeFlow === 'reschedule' ? 'attendance_reschedule' : 'counselor_new_times',
        leadMessage: lead,
      })
      setProposeSessionId(null)
      setProposeFlow(null)
      refreshMessages()
    } catch (e) {
      console.error('Failed to propose slots:', e)
      alert(e instanceof Error ? e.message : 'Could not send new times. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleMarkAttendance = async (status: AttendanceStatus) => {
    if (!user?.id || !attendanceTarget) return
    const sessionId = resolveSessionDocId(attendanceTarget)
    if (!sessionId) {
      alert('This session is missing a valid link.')
      return
    }

    if (status === 'needs_rescheduling') {
      setAttendanceTarget(null)
      setProposeFlow('reschedule')
      setProposeSessionId(sessionId)
      return
    }

    const outcome = status === 'showed_up' ? 'completed' : 'missed'
    setIsSending(true)
    try {
      await sessionsService.markSessionAttendance(sessionId, outcome, {
        counselorId: user.id,
        studentId: contact.id,
        attendanceNote:
          outcome === 'completed'
            ? 'Marked completed by counselor.'
            : 'Student did not show up.',
      })
      setAttendanceTarget(null)
      refreshMessages()
    } catch (e) {
      console.error('Failed to mark attendance:', e)
      alert('Could not update attendance. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] -mx-3 sm:-mx-4 lg:-mx-6 xl:-mx-8 -my-3 sm:-my-4 lg:-my-6">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-aurora-gray-200 shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-aurora-gray-100 transition-colors cursor-pointer"
          aria-label="Back to contacts"
        >
          <ArrowLeft className="w-5 h-5 text-aurora-gray-600" />
        </button>

        <div className="flex items-center gap-3">
          <div className="relative">
            <LetterAvatar name={contact.name} size={36} avatarUrl={contact.avatar} />
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-aurora-accent-green border-2 border-white" />
            )}
          </div>
          <div className="text-center">
            <p className="font-bold text-aurora-primary-dark text-sm">{contact.name}</p>
            <div className="flex items-center justify-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-aurora-accent-green' : 'bg-aurora-gray-400'}`} />
              <span className="text-xs text-aurora-gray-500">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="w-9" aria-hidden />
      </div>

      {messagingClosed ? <ConversationReadOnlyBanner role={viewerRole} /> : null}

      {viewerRole === 'student' && !messagingClosed ? (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-aurora-accent-purple/10 border border-aurora-accent-purple/20">
          <p className="text-[11px] font-bold text-aurora-accent-purple text-center tracking-wider uppercase">
            This is a private conversation with your counselor.
          </p>
        </div>
      ) : null}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-xs font-semibold text-aurora-gray-400 text-center tracking-wider mb-4">
          TODAY
        </p>

        {isLoadingMessages ? (
          <div className="flex justify-center py-10">
            <div className="spinner" />
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              contactName={contact.name}
              userName={user?.full_name ?? 'You'}
              contactAvatarUrl={contact.avatar || undefined}
              userAvatarUrl={user?.avatar_url ?? undefined}
              viewerRole={user?.role === 'counselor' ? 'counselor' : 'student'}
              messagingClosed={messagingClosed}
              onConfirmSession={handleConfirmSession}
              isConfirming={isSending}
              onViewDetails={handleViewDetails}
              onReschedule={user?.role === 'counselor' ? handleReschedule : undefined}
              onAcceptSessionRequest={
                user?.role === 'counselor'
                  ? (m) => {
                      if (m.type === 'session_request') void handleAcceptSessionRequest(m)
                    }
                  : undefined
              }
              onProposeSessionRequest={
                user?.role === 'counselor'
                  ? (m) => {
                      if (m.type === 'session_request') handleProposeSessionRequest(m)
                    }
                  : undefined
              }
              onMarkAttendance={
                user?.role === 'counselor'
                  ? (m) => setAttendanceTarget(m)
                  : undefined
              }
            />
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-aurora-gray-200 px-4 py-3">
        {messagingClosed ? (
          <p className="text-center text-sm text-aurora-gray-500 py-2">
            Messaging is closed for this conversation. You can read history above.
          </p>
        ) : (
        <>
        <div className="flex items-center gap-3">
          {user?.role === 'counselor' ? (
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="w-10 h-10 rounded-full bg-aurora-gray-100 flex items-center justify-center shrink-0 hover:bg-aurora-gray-200 transition-colors cursor-pointer"
              title="Send Session Invite"
            >
              <Calendar className="w-5 h-5 text-aurora-secondary-blue" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSessionRequestModal(true)}
              className="w-10 h-10 rounded-full bg-aurora-gray-100 flex items-center justify-center shrink-0 hover:bg-aurora-gray-200 transition-colors cursor-pointer"
              title="Request a session"
            >
              <CalendarPlus className="w-5 h-5 text-aurora-secondary-blue" />
            </button>
          )}

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-aurora-gray-100 rounded-full px-4 py-2.5 text-sm text-aurora-primary-dark placeholder:text-aurora-gray-400 outline-none focus:ring-2 focus:ring-aurora-secondary-blue/30"
            aria-label="Message input"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !message.trim()}
            className="w-10 h-10 rounded-full bg-aurora-secondary-blue flex items-center justify-center shrink-0 hover:bg-aurora-secondary-dark-blue transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[11px] text-aurora-gray-400 text-center mt-2">
          Messages are encrypted and shared only with your counselor.
        </p>
        </>
        )}
      </div>

      {user?.role === 'counselor' && (
        <>
          <SendSessionInviteModal
            visible={isInviteModalOpen}
            student={{
              id: contact.id,
              name: contact.name,
              avatar: contact.avatar,
            }}
            counselorId={user.id}
            onClose={() => setIsInviteModalOpen(false)}
            onSuccess={() => {
              refreshMessages()
              setTimeout(() => {
                scrollRef.current?.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: 'smooth',
                })
              }, 500)
            }}
          />
          <SendSessionInviteModal
            visible={!!proposeSessionId}
            mode="propose"
            modalTitle={proposeFlow === 'reschedule' ? 'Reschedule session' : 'Propose New Time'}
            subtitle={
              proposeFlow === 'reschedule'
                ? 'Send updated time options for this student.'
                : 'Suggest times that work on your side.'
            }
            submitLabel="Send new times"
            student={{
              id: contact.id,
              name: contact.name,
              avatar: contact.avatar,
            }}
            counselorId={user.id}
            onClose={() => {
              setProposeSessionId(null)
              setProposeFlow(null)
            }}
            onSuccess={() => {
              refreshMessages()
              setTimeout(() => {
                scrollRef.current?.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: 'smooth',
                })
              }, 500)
            }}
            onProposeSlots={handleProposeSlotsFromModal}
          />
          <SessionAttendanceModal
            open={!!attendanceTarget}
            studentName={contact.name}
            studentAvatar={contact.avatar}
            sessionDate={attendanceTarget?.session.date ?? attendanceTarget?.session.agreedSlot?.date ?? ''}
            sessionTime={attendanceTarget?.session.time ?? attendanceTarget?.session.agreedSlot?.time ?? ''}
            busy={isSending}
            onClose={() => setAttendanceTarget(null)}
            onMarkLater={() => setAttendanceTarget(null)}
            onMarkStatus={(status) => void handleMarkAttendance(status)}
          />
        </>
      )}

      <SessionChatDetailsModal
        open={!!detailsTarget}
        message={detailsTarget}
        onClose={() => setDetailsTarget(null)}
      />

      {user?.role !== 'counselor' && (
        <StudentSessionRequestModal
          visible={showSessionRequestModal}
          sending={isSending}
          onClose={() => setShowSessionRequestModal(false)}
          onSend={(data) => void handleSendSessionRequest(data)}
        />
      )}
    </div>
  )
}