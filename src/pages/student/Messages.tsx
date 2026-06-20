import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { messagesService } from '../../services/messages'
import { ContactRow } from '../../components/messages/ContactRow'
import { DirectMessageView } from '../../components/messages/DirectMessageView'
import { SelectCounselorModal } from '../../components/messages/SelectCounselorModal'
import type { CounselorContact } from '../../types/message.types'
import { PenLine } from 'lucide-react'
import { PrivacyNoticeBanner } from '../../components/privacy/PrivacyNoticeBanner'
import { STUDENT_MESSAGES_PRIVACY_FOOTER } from '../../constants/student-privacy'

type TabType = 'All messages' | 'Unread'

const TABS: TabType[] = ['All messages', 'Unread']

type SessionRequestNavState = {
  counselorId?: string
  openSessionRequest?: boolean
}

const tabButtonClass = (active: boolean) =>
  `shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors cursor-pointer ${
    active
      ? 'border-aurora-blue/45 bg-aurora-blue/15 text-white'
      : 'border-white/12 bg-transparent text-[#7B8EC8] hover:border-white/20 hover:text-white'
  }`

export default function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>('All messages')
  const [showPastCollegeConversations, setShowPastCollegeConversations] = useState(false)
  const [selectedContact, setSelectedContact] = useState<CounselorContact | null>(null)
  const [contacts, setContacts] = useState<CounselorContact[]>([])
  const [pastContacts, setPastContacts] = useState<CounselorContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectCounselorOpen, setSelectCounselorOpen] = useState(false)
  const [autoOpenSessionRequest, setAutoOpenSessionRequest] = useState(false)
  const [openingThread, setOpeningThread] = useState(false)
  const openThreadRequestIdRef = useRef(0)

  const studentCollegeOpts = useMemo(
    () => ({
      activeCollegeCode: user?.college_code,
      department: user?.department,
    }),
    [user?.college_code, user?.department],
  )

  const loadConversations = useCallback(async () => {
    if (!user?.id) return
    const [active, past] = await Promise.all([
      messagesService.getConversationsForStudent(user.id, {
        ...studentCollegeOpts,
        inboxScope: 'active',
      }),
      messagesService.getConversationsForStudent(user.id, {
        ...studentCollegeOpts,
        inboxScope: 'past',
      }),
    ])
    setContacts(active)
    setPastContacts(past)
  }, [user?.id, studentCollegeOpts])

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }
    let isCancelled = false
    loadConversations()
      .catch(() => {
        if (!isCancelled) {
          setContacts([])
          setPastContacts([])
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })
    return () => {
      isCancelled = true
    }
  }, [user?.id, loadConversations])

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
        const [activeConvos, pastConvos] = await Promise.all([
          messagesService.getConversationsForStudent(user.id, {
            ...studentCollegeOpts,
            inboxScope: 'active',
          }),
          messagesService.getConversationsForStudent(user.id, {
            ...studentCollegeOpts,
            inboxScope: 'past',
          }),
        ])
        if (requestId !== openThreadRequestIdRef.current) return

        let contact =
          activeConvos.find((c) => c.id === counselorId) ??
          pastConvos.find((c) => c.id === counselorId)

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
        await loadConversations()
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
      studentCollegeOpts,
      user?.full_name,
      user?.avatar_url,
      clearSessionRequestRoute,
      loadConversations,
    ],
  )

  useEffect(() => {
    if (!user?.id) return

    const navState = (location.state ?? {}) as SessionRequestNavState
    const counselorId =
      (navState.counselorId?.trim() || searchParams.get('counselorId')?.trim() || '') ?? ''
    const shouldOpenRequest =
      navState.openSessionRequest === true || searchParams.get('openSessionRequest') === '1'

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

  const handleSelectCounselor = async (counselor: {
    id: string
    full_name?: string
    avatar_url?: string
  }) => {
    if (!user?.id) return
    try {
      const contact = await messagesService.openCounselorThreadForStudent({
        studentId: user.id,
        studentName: user.full_name ?? 'Student',
        studentAvatar: user.avatar_url ?? undefined,
        counselorId: counselor.id,
      })
      setSelectedContact(contact)
      setAutoOpenSessionRequest(false)
      await loadConversations()
    } catch (e) {
      console.error('Failed to start conversation:', e)
      alert(e instanceof Error ? e.message : 'Could not start conversation.')
    }
  }

  const listSource = showPastCollegeConversations ? pastContacts : contacts

  const filtered = useMemo(() => {
    if (activeTab === 'All messages') return listSource
    return listSource.filter((c) => c.isUnread)
  }, [activeTab, listSource])

  const emptyMessage = showPastCollegeConversations
    ? pastContacts.length === 0
      ? 'No past-college conversations. Older college threads appear here as read-only history.'
      : 'No unread conversations in past-college history.'
    : contacts.length === 0
      ? 'No conversations yet. Tap the button below to message a counselor.'
      : 'No unread conversations.'

  if (selectedContact) {
    return (
      <DirectMessageView
        contact={selectedContact}
        autoOpenSessionRequestModal={autoOpenSessionRequest}
        onBack={() => {
          setSelectedContact(null)
          setAutoOpenSessionRequest(false)
          void loadConversations()
        }}
      />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col lg:max-w-none">
      <header className="shrink-0 pb-2">
        <p className="mb-1 text-[10px] font-bold tracking-[0.15em] text-aurora-blue uppercase">
          Counselor Conversations
        </p>
        <h2 className="font-heading text-2xl font-extrabold text-white sm:text-3xl">Messages</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#7B8EC8]">
          You are chatting with your assigned counselors here.
        </p>
      </header>

      <PrivacyNoticeBanner
        className="mt-3 mb-1"
        message={`${STUDENT_MESSAGES_PRIVACY_FOOTER} Tap for full privacy details.`}
      />

      {/* Filters — one horizontal row (mobile parity); scroll on narrow widths */}
      <div className="-mx-3 shrink-0 border-b border-white/8 sm:mx-0">
        <div
          className="flex items-center gap-2.5 overflow-x-auto px-3 py-3 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="toolbar"
          aria-label="Message filters"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={tabButtonClass(activeTab === tab)}
            >
              {tab}
            </button>
          ))}

          <button
            type="button"
            role="checkbox"
            aria-checked={showPastCollegeConversations}
            onClick={() => setShowPastCollegeConversations((prev) => !prev)}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
              showPastCollegeConversations
                ? 'border-aurora-blue/45 bg-aurora-blue/14 font-bold text-aurora-blue'
                : 'border-white/12 bg-transparent font-medium text-[#7B8EC8] hover:border-white/20'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] ${
                showPastCollegeConversations
                  ? 'border-aurora-blue bg-aurora-blue'
                  : 'border-white/25 bg-transparent'
              }`}
              aria-hidden
            >
              {showPastCollegeConversations ? (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <span>Past college</span>
          </button>
        </div>
      </div>

      {showPastCollegeConversations ? (
        <p className="shrink-0 px-1 py-2 text-xs leading-relaxed text-amber-200/90">
          Read-only history from a previous college. Messaging is closed for these threads.
        </p>
      ) : null}

      {/* Conversation list */}
      <div className="relative min-h-[min(420px,calc(100dvh-16rem))] flex-1 -mx-3 sm:mx-0 sm:min-h-[320px]">
        <div className="h-full overflow-hidden sm:rounded-2xl sm:border sm:border-white/8 sm:bg-[#0a0f28]/60">
          {isLoading || openingThread ? (
            <div className="flex flex-col items-center justify-center px-6 py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-blue border-t-transparent" />
              <p className="mt-4 text-center text-sm text-[#4B5693]">
                {openingThread
                  ? 'Opening your counselor conversation...'
                  : 'Loading conversations...'}
              </p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="divide-y divide-white/8 px-3 sm:px-4">
              {filtered.map((contact) => (
                <ContactRow
                  key={contact.conversationId}
                  contact={contact}
                  onSelect={() => setSelectedContact(contact)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-8 py-16 text-center sm:py-20">
              <p className="max-w-xs text-sm leading-relaxed text-[#4B5693]">{emptyMessage}</p>
            </div>
          )}
        </div>

        {/* Single FAB — mobile parity: start a new counselor conversation */}
        {!showPastCollegeConversations ? (
          <button
            type="button"
            onClick={() => setSelectCounselorOpen(true)}
            aria-label="Message a counselor"
            className="fixed right-4 bottom-[5.25rem] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-aurora-blue text-white shadow-[0_4px_24px_rgba(45,107,255,0.45)] transition-colors hover:bg-blue-600 cursor-pointer lg:bottom-8 lg:right-10"
          >
            <PenLine className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <SelectCounselorModal
        visible={selectCounselorOpen}
        studentId={user?.id ?? ''}
        onClose={() => setSelectCounselorOpen(false)}
        onSelect={(c) => void handleSelectCounselor(c)}
      />
    </div>
  )
}
