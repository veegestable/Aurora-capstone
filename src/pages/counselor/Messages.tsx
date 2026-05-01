import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { messagesService } from '../../services/messages'
import { ContactRow } from '../../components/messages/ContactRow'
import { DirectMessageView } from '../../components/messages/DirectMessageView'
import type { StudentContact } from '../../types/message.types'

type TabType = 'All messages' | 'Unread'

const TABS: TabType[] = ['All messages', 'Unread']

export default function Messages() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('All messages')
  const [selectedContact, setSelectedContact] = useState<StudentContact | null>(null)
  const [contacts, setContacts] = useState<StudentContact[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }
    let isCancelled = false
    messagesService
      .getConversationsForCounselor(user.id)
      .then((convos) => {
        if (!isCancelled) setContacts(convos)
      })
      .catch(() => {
        if (!isCancelled) setContacts([])
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })
    return () => { isCancelled = true }
  }, [user?.id])

  const refreshConversations = () => {
    if (!user?.id) return
    messagesService
      .getConversationsForCounselor(user.id)
      .then(setContacts)
      .catch(() => setContacts([]))
  }

  // Chat View
  if (selectedContact) {
    return (
      <DirectMessageView
        contact={selectedContact}
        onBack={() => {
          setSelectedContact(null)
          refreshConversations()
        }}
      />
    )
  }

  // Filter contacts
  const filtered =
    activeTab === 'All messages'
      ? contacts
      : contacts.filter((c) => c.isUnread)

  const unreadCount = contacts.filter((c) => c.isUnread).length

  // Contact List View
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-blue uppercase mb-1">
          Student Conversations
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
          Messages
        </h2>
        <p className="text-sm text-[#7B8EC8] mt-1">
          {unreadCount} Unread Conversation{unreadCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tab Pills */}
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

      {/* Contact List */}
      <div>
        {isLoading ? (
          <div className="flex flex-col items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-blue" />
            <p className="text-[#4B5693] text-sm mt-4">
              Loading conversations...
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
                ? 'No conversations yet. Invite students from the Student Directory.'
                : 'No unread conversations.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}