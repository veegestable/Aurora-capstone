import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { messagesService } from '../../services/messages'
import { auditLogsService } from '../../services/audit-logs'
import { sessionsService } from '../../services/sessions'
import { LetterAvatar } from '../LetterAvatar'
import { ChatBubble } from './ChatBubble'
import { ArrowLeft, Send, Info } from 'lucide-react'
import type { CounselorContact, StudentContact, ChatMessage } from '../../types/message.types'
import { usePeerPresence } from '../../hooks/usePeerPresence'

interface DirectMessageViewProps {
  contact: CounselorContact | StudentContact
  onBack: () => void
}

export function DirectMessageView({ contact, onBack }: DirectMessageViewProps) {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const peerOnline = usePeerPresence(contact.id)
  const isOnline = peerOnline || contact.isOnline

  useEffect(() => {
    if (!contact.conversationId || !user?.id) {
      setIsLoadingMessages(false)
      return
    }

    let isCancelled = false
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = message.trim()
    if (!text || !user?.id || !contact.conversationId || isSending) return

    setIsSending(true)
    try {
      const msgId = await messagesService.sendTextMessage(
        contact.conversationId,
        user.id,
        text
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
        targetId: contact.conversationId
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
    slot: {
      date: string
      time: string
    }
  ) => {
    if (!user?.id || !contact.conversationId || isSending) return
    if (!sessionId || sessionId.startsWith('session_')) {
      alert('This invite is missing a valid session link.')
      return
    }

    setIsSending(true)
    try {
      // 1. Confirm slot in Firestore
      await sessionsService.studentConfirmFinalSlot(
        sessionId, 
        user.id, 
        slot, 
        {
          conversationId: contact.conversationId,
          counselorId: contact.id
        }
      )

      // 2. Send the automated "Accepted" message to the chat
      await messagesService.sendTextMessage(
        contact.conversationId, 
        user.id, 
        `__AUTO_ACCEPTED__Just accepted your request`
      )

      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }, 100)
    } catch (e: any) {
      console.error('Failed to confirm session time:', e)
      alert('Could not confirm session: ' + (e.message || 'Please try again.'))
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
            <p className="font-bold text-aurora-primary-dark text-sm">
              {contact.name}
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-aurora-accent-green' : 'bg-aurora-gray-400'
                }`}
              />
              <span className="text-xs text-aurora-gray-500">
                {isOnline ? 'Online now' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <button
          className="p-1.5 rounded-lg hover:bg-aurora-gray-100 transition-colors cursor-pointer"
          aria-label="Conversation info"
        >
          <Info className="w-5 h-5 text-aurora-gray-500" />
        </button>
      </div>

      {/* Privacy Banner */}
      <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-aurora-accent-purple/10 border border-aurora-accent-purple/20">
        <p className="text-[11px] font-bold text-aurora-accent-purple text-center tracking-wider uppercase">
          This is a private conversation with your counselor.
        </p>
      </div>

      {/* Messages Area */}
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
              onConfirmSession={handleConfirmSession}
              isConfirming={isSending}
            />
          ))
        )}
      </div>

      {/* Input Bar */}
      <div className="shrink-0 border-t border-aurora-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
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
      </div>
    </div>
  )
}
