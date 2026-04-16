import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { messagesService } from '../../services/messages'
import { ContactRow } from '../../components/messages/ContactRow'
import { DirectMessageView } from '../../components/messages/DirectMessageView'
import type { StudentContact } from '../../types/message.types'

type FilterTab = 'All Messages' | 'Unread' | 'Priority'

const TABS: FilterTab[] = ['All Messages', 'Unread', 'Priority']

export default function Messages() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<FilterTab>('All Messages')
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
    activeTab === 'All Messages'
      ? contacts
      : activeTab === 'Unread'
        ? contacts.filter((c) => c.isUnread)
        : contacts.filter((c) => c.isAlerted)

  const unreadCount = contacts.filter((c) => c.isUnread).length

  // Contact List View
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-aurora-primary-dark font-heading">
          Messages
        </h2>
        <p className="text-sm text-aurora-primary-dark/50 mt-1">
          {unreadCount} Unread Conversation{unreadCount !== 1 ? 's' : ''}
        </p>
      </div>
      {/* Filter Tabs */}
      <div className="flex border-b border-aurora-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2.5 mr-5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === tab
                ? 'border-aurora-secondary-blue text-aurora-secondary-blue'
                : 'border-transparent text-aurora-gray-500 hover:text-aurora-primary-dark'
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aurora-secondary-blue" />
            <p className="text-aurora-gray-400 text-sm mt-4">
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
            <p className="text-aurora-gray-400 text-sm">
              {contacts.length === 0
                ? 'No conversations yet. Invite students from the Risk Center.'
                : 'No conversations match this filter.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}