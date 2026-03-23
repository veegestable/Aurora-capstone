import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { messagesService } from '../../services/messages'
import { ContactRow } from '../../components/messages/ContactRow'
import { DirectMessageView } from '../../components/messages/DirectMessageView'
import type { CounselorContact } from '../../types/message.types'

type TabType = 'Counselors' | 'Peer Support' | 'Archive'

const TABS: TabType[] = ['Counselors', 'Peer Support', 'Archive']

export default function Messages() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('Counselors')
  const [selectedContact, setSelectedContact] = useState<CounselorContact | null>(null)
  const [contacts, setContacts] = useState<CounselorContact[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }
    let isCancelled = false
    messagesService
      .getConversationsForStudent(user.id)
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
      .getConversationsForStudent(user.id)
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

  // Contact List View 
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-aurora-primary-dark font-heading">
          Messages
        </h2>
      </div>

      {/* Tabs */}
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
            <div className="spinner" />
            <p className="text-aurora-gray-400 text-sm mt-4">
              Loading conversations...
            </p>
          </div>
        ) : activeTab === 'Counselors' && contacts.length > 0 ? (
          contacts.map((contact) => (
            <ContactRow
              key={contact.conversationId}
              contact={contact}
              onSelect={() => setSelectedContact(contact)}
            />
          ))
        ) : activeTab === 'Counselors' ? (
          <div className="text-center py-16">
            <p className="text-aurora-gray-400 text-sm">
              No conversations yet. Your counselor will invite you when
              they're ready to connect.
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-aurora-gray-400 text-sm">
              No conversations yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}