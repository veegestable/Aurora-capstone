import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { messagesService } from '../../services/messages'
import { ContactRow } from '../../components/messages/ContactRow'
import { DirectMessageView } from '../../components/messages/DirectMessageView'
import { DashboardSessionRequestModal } from '../../components/sessions/DashboardSessionRequestModal'
import type { CounselorContact } from '../../types/message.types'
import { CalendarPlus } from 'lucide-react'

type TabType = 'All messages' | 'Unread'

const TABS: TabType[] = ['All messages', 'Unread']

type SessionRequestNavState = {
  counselorId?: string
  openSessionRequest?: boolean
}

export default function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>('All messages')
  const [selectedContact, setSelectedContact] = useState<CounselorContact | null>(null)
  const [contacts, setContacts] = useState<CounselorContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [autoOpenSessionRequest, setAutoOpenSessionRequest] = useState(false)
  const [openingThread, setOpeningThread] = useState(false)
  const openThreadRequestIdRef = useRef(0)

  const refreshConversations = useCallback(() => {
    if (!user?.id) return
    messagesService
      .getConversationsForStudent(user.id, {
        activeCollegeCode: user.college_code,
      })
      .then(setContacts)
      .catch(() => setContacts([]))
  }, [user?.id, user?.college_code])

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }
    let isCancelled = false
    messagesService
      .getConversationsForStudent(user.id, {
        activeCollegeCode: user.college_code,
      })
      .then((convos) => {
        if (!isCancelled) setContacts(convos)
      })
      .catch(() => {
        if (!isCancelled) setContacts([])
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })
    return () => {
      isCancelled = true
    }
  }, [user?.id, user?.college_code])

  const clearSessionRequestRoute = useCallback(() => {
    const navState = location.state as SessionRequestNavState | null
    if (navState?.counselorId || navState?.openSessionRequest) {
      navigate(location.pathname, { replace: true, state: null })
    }
    if (searchParams.get('counselorId') || searchParams.get('openSessionRequest')) {
      setSearchParams({}, { replace: true })
    }
  }, [location.pathname, location.state, navigate, searchParams, setSearchParams])

  const openCounselorThread = useCallback(
    async (counselorId: string, shouldOpenRequest: boolean) => {
      if (!user?.id) return

      const requestId = ++openThreadRequestIdRef.current
      setOpeningThread(true)

      try {
        const convos = await messagesService.getConversationsForStudent(user.id, {
          activeCollegeCode: user.college_code,
        })
        if (requestId !== openThreadRequestIdRef.current) return

        let contact = convos.find((c) => c.id === counselorId)

        if (!contact) {
          contact = await messagesService.openCounselorThreadForStudent({
            studentId: user.id,
            studentName: user.full_name ?? 'Student',
            studentAvatar: user.avatar_url ?? undefined,
            counselorId,
          })
        }

        if (requestId !== openThreadRequestIdRef.current) return

        setSelectedContact(contact)
        setAutoOpenSessionRequest(shouldOpenRequest)
        clearSessionRequestRoute()
        refreshConversations()
      } catch (e) {
        if (requestId !== openThreadRequestIdRef.current) return
        console.error('Failed opening counselor thread:', e)
        clearSessionRequestRoute()
        alert(
          e instanceof Error
            ? e.message
            : 'Could not open your counselor conversation. Please try again.',
        )
      } finally {
        if (requestId === openThreadRequestIdRef.current) {
          setOpeningThread(false)
        }
      }
    },
    [
      user?.id,
      user?.college_code,
      user?.full_name,
      user?.avatar_url,
      clearSessionRequestRoute,
      refreshConversations,
    ],
  )

  useEffect(() => {
    if (!user?.id) return

    const navState = (location.state ?? {}) as SessionRequestNavState
    const counselorId =
      (navState.counselorId?.trim() ||
        searchParams.get('counselorId')?.trim() ||
        '') ?? ''
    const shouldOpenRequest =
      navState.openSessionRequest === true ||
      searchParams.get('openSessionRequest') === '1'

    if (!counselorId) return

    if (
      selectedContact?.id === counselorId &&
      (!shouldOpenRequest || autoOpenSessionRequest)
    ) {
      clearSessionRequestRoute()
      return
    }

    void openCounselorThread(counselorId, shouldOpenRequest)
  }, [
    user?.id,
    location.state,
    searchParams,
    openCounselorThread,
    selectedContact?.id,
    autoOpenSessionRequest,
    clearSessionRequestRoute,
  ])

  const handleCounselorPicked = (counselorId: string) => {
    navigate('/student/messages', {
      replace: true,
      state: { counselorId, openSessionRequest: true },
    })
    setSearchParams(
      { counselorId, openSessionRequest: '1' },
      { replace: true },
    )
  }

  if (selectedContact) {
    return (
      <DirectMessageView
        contact={selectedContact}
        autoOpenSessionRequestModal={autoOpenSessionRequest}
        onBack={() => {
          setSelectedContact(null)
          setAutoOpenSessionRequest(false)
          refreshConversations()
        }}
      />
    )
  }

  const filtered =
    activeTab === 'All messages'
      ? contacts
      : contacts.filter((c) => c.isUnread)

  return (
    <div className="space-y-5 relative pb-24">
      <div>
        <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-blue uppercase mb-1">
          Counselor Conversations
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
          Messages
        </h2>
        <p className="text-sm text-[#7B8EC8] mt-1">
          You are chatting with your assigned counselors here.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
              activeTab === tab
                ? 'bg-aurora-blue/15 border-aurora-blue/40 text-white'
                : 'bg-transparent border-white/12 text-[#7B8EC8] hover:border-white/20'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div>
        {isLoading || openingThread ? (
          <div className="flex flex-col items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-blue" />
            <p className="text-[#4B5693] text-sm mt-4">
              {openingThread
                ? 'Opening your counselor conversation...'
                : 'Loading conversations...'}
            </p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((contact) => (
            <ContactRow
              key={contact.conversationId}
              contact={contact}
              onSelect={() => setSelectedContact(contact)}
            />
          ))
        ) : (
          <div className="text-center py-16">
            <p className="text-[#4B5693] text-sm">
              {contacts.length === 0
                ? 'No conversations yet. Use the + button to request a session with a counselor.'
                : 'No unread conversations.'}
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setSessionModalOpen(true)}
        aria-label="Request a session"
        className="fixed bottom-24 right-6 lg:bottom-8 lg:right-10 z-40 w-14 h-14 rounded-full bg-aurora-blue hover:bg-blue-600 text-white shadow-aurora-lg flex items-center justify-center transition-colors cursor-pointer"
      >
        <CalendarPlus className="w-5 h-5" />
      </button>

      <DashboardSessionRequestModal
        visible={sessionModalOpen}
        studentId={user?.id ?? ''}
        onClose={() => setSessionModalOpen(false)}
        onSuccess={({ counselorId }) => {
          setSessionModalOpen(false)
          handleCounselorPicked(counselorId)
        }}
      />
    </div>
  )
}


