import { useState, useEffect, useCallback } from 'react'
import { Pencil } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { messagesService } from '../../services/messages'
import { ContactRow } from '../../components/messages/ContactRow'
import { ArchiveConversationModal } from '../../components/messages/ArchiveConversationModal'
import { DirectMessageView } from '../../components/messages/DirectMessageView'
import { SelectStudentForChatModal } from '../../components/counselor/SelectStudentForChatModal'
import type { StudentContact } from '../../types/message.types'
import type { StudentInfo } from '../../services/counselor'

type TabType = 'All messages' | 'Unread'

const TABS: TabType[] = ['All messages', 'Unread']

export default function Messages() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('All messages')
  const [selectedContact, setSelectedContact] = useState<StudentContact | null>(null)
  const [contacts, setContacts] = useState<StudentContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [writeOpen, setWriteOpen] = useState(false)
  const [openingChat, setOpeningChat] = useState(false)
  const [archiveContact, setArchiveContact] = useState<StudentContact | null>(null)
  const [archiveBusy, setArchiveBusy] = useState(false)

  const conversationIdFor = useCallback(
    (contact: StudentContact) =>
      contact.conversationId || (user?.id ? `${user.id}_${contact.id}` : ''),
    [user?.id],
  )

  const refreshConversations = async () => {
    if (!user?.id) return [] as StudentContact[]
    try {
      const convos = await messagesService.getConversationsForCounselor(user.id, {
        activeCollegeCode: user.college_code,
      })
      setContacts(convos)
      return convos
    } catch {
      setContacts([])
      return [] as StudentContact[]
    }
  }

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }
    let isCancelled = false
    messagesService
      .getConversationsForCounselor(user.id, {
        activeCollegeCode: user.college_code,
      })
      .then((convos) => { if (!isCancelled) setContacts(convos) })
      .catch(() => { if (!isCancelled) setContacts([]) })
      .finally(() => { if (!isCancelled) setIsLoading(false) })
    return () => { isCancelled = true }
  }, [user?.id, user?.college_code])

  const confirmArchiveConversation = async () => {
    if (!user?.id || !archiveContact) return
    const convId = conversationIdFor(archiveContact)
    if (!convId) {
      alert('Could not archive. Missing conversation id — try refreshing the list.')
      return
    }
    setArchiveBusy(true)
    try {
      await messagesService.counselorArchiveConversation(user.id, convId)
      if (selectedContact?.conversationId === convId) {
        setSelectedContact(null)
      }
      setArchiveContact(null)
      await refreshConversations()
    } catch (e) {
      console.error('Archive conversation failed:', e)
      alert('Could not archive. Please check your connection and try again.')
    } finally {
      setArchiveBusy(false)
    }
  }

  const handleSelectStudentForNewChat = async (student: StudentInfo) => {
    if (!user?.id) return
    setOpeningChat(true)
    try {
      await messagesService.createConversation(
        user.id,
        { id: student.id, name: student.full_name, isAlerted: false, borderColor: undefined },
        { name: user.full_name || 'Counselor', avatar: user.avatar_url || '' },
      )
      const convos = await refreshConversations()
      const target = convos.find((c) => c.id === student.id)
      if (target) {
        setSelectedContact(target)
      }
      setWriteOpen(false)
    } catch (e) {
      console.error('Failed to start chat:', e)
      alert('Could not start chat. Please try again.')
    } finally {
      setOpeningChat(false)
    }
  }

  if (selectedContact) {
    return (
      <DirectMessageView
        contact={selectedContact}
        onBack={() => {
          setSelectedContact(null)
          void refreshConversations()
        }}
      />
    )
  }

  const filtered = activeTab === 'All messages' ? contacts : contacts.filter((c) => c.isUnread)
  const unreadCount = contacts.filter((c) => c.isUnread).length

  return (
    <div className="space-y-5 relative pb-24">
      <div>
        <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-blue uppercase mb-1">
          Student Conversations
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">Messages</h2>
        <p className="text-sm text-[#7B8EC8] mt-1">
          {unreadCount} Unread Conversation{unreadCount !== 1 ? 's' : ''}
          {' · '}
          Only your current college · verified students · hover ⋮ to hide a thread
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
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
        {isLoading ? (
          <div className="flex flex-col items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-blue" />
            <p className="text-[#4B5693] text-sm mt-4">Loading conversations...</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((contact) => (
            <ContactRow
              key={contact.conversationId}
              contact={contact}
              onSelect={() => setSelectedContact(contact)}
              onArchiveRequest={() => setArchiveContact(contact)}
            />
          ))
        ) : (
          <div className="text-center py-16">
            <p className="text-[#4B5693] text-sm">
              {contacts.length === 0
                ? 'No conversations yet. Start one with the Write Message button.'
                : 'No unread conversations.'}
            </p>
          </div>
        )}
      </div>

      {/* Write Message FAB */}
      <button
        type="button"
        onClick={() => setWriteOpen(true)}
        disabled={openingChat}
        aria-label="Write a new message"
        className="fixed bottom-24 right-6 lg:bottom-8 lg:right-10 z-40 w-14 h-14 rounded-full bg-aurora-blue hover:bg-blue-600 text-white shadow-aurora-lg flex items-center justify-center transition-colors disabled:opacity-60 cursor-pointer"
      >
        <Pencil className="w-5 h-5" />
      </button>

      <SelectStudentForChatModal
        open={writeOpen}
        onClose={() => setWriteOpen(false)}
        onSelect={handleSelectStudentForNewChat}
      />

      <ArchiveConversationModal
        open={archiveContact !== null}
        contactName={archiveContact?.name ?? 'this student'}
        busy={archiveBusy}
        onCancel={() => !archiveBusy && setArchiveContact(null)}
        onConfirm={() => void confirmArchiveConversation()}
      />
    </div>
  )
}