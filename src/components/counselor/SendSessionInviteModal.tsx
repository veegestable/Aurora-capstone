import { useState } from 'react'
import { X, Send, Calendar } from 'lucide-react'
import { sessionsService } from '../../services/sessions'
import { ModalPortal } from '../common/ModalPortal'
import { LetterAvatar } from '../LetterAvatar'
import {
  formatSlotsFromInputs,
  type ProposedSlot,
} from '../../utils/formatSessionInviteSlots'

interface SendSessionInviteModalProps {
  visible: boolean
  student: {
    id: string
    name: string
    avatar?: string
  }
  counselorId: string
  mode?: 'invite' | 'propose'
  modalTitle?: string
  subtitle?: string
  submitLabel?: string
  initialNote?: string
  onClose: () => void
  onSuccess: () => void
  onProposeSlots?: (slots: ProposedSlot[], note: string) => Promise<void>
}

export function SendSessionInviteModal({
  visible,
  student,
  counselorId,
  mode = 'invite',
  modalTitle,
  subtitle,
  submitLabel,
  initialNote,
  onClose,
  onSuccess,
  onProposeSlots,
}: SendSessionInviteModalProps) {
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState(
    initialNote ??
      `Hi ${student.name.split(' ')[0]}, I'd like to check in with you regarding your recent academic progress.`,
  )
  
  // State for the 3 slots
  const [slots, setSlots] = useState<{ date: string; time: string }[]>([
    { date: '', time: '' },
    { date: '', time: '' },
    { date: '', time: '' }
  ])

  const handleUpdateSlot = (index: number, field: 'date' | 'time', value: string) => {
    const newSlots = [...slots]
    newSlots[index][field] = value
    setSlots(newSlots)
  }

  const handleSend = async () => {
    const validSlots = slots.filter(s => s.date && s.time)
    
    if (validSlots.length === 0) {
      alert('Please provide at least one valid time slot.')
      return
    }

    // Format raw dates/times to readable string (e.g., April 28, 2026 at 2:00 PM)
    const formattedSlots = formatSlotsFromInputs(validSlots)

    setSending(true)
    try {
      if (mode === 'propose' && onProposeSlots) {
        await onProposeSlots(formattedSlots, note.trim())
      } else {
        await sessionsService.createCounselorSessionInvite(
          counselorId,
          student.id,
          formattedSlots,
          { note: note.trim() },
        )
      }
      onSuccess()
      onClose()
    } catch (e) {
      console.error('Failed to send invite:', e)
      alert(e instanceof Error ? e.message : 'Failed to send invite. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (!visible) return null

  return (
    <ModalPortal open={visible}>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 lg:pb-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-lg card-aurora border border-aurora-border p-6 shadow-2xl max-h-[min(90vh,calc(100dvh-6rem))] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {modalTitle ?? (mode === 'propose' ? 'Propose New Time' : 'Send Session Invite')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-aurora-text-sec transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <LetterAvatar name={student.name} size={64} avatarUrl={student.avatar} />
          <p className="text-lg font-bold text-white mt-3">{student.name}</p>
          <p className="text-sm text-aurora-text-sec text-center">
            {subtitle ?? 'Invite to a supportive counseling session'}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <label className="text-xs font-semibold text-aurora-text-sec uppercase tracking-wider block">
            Proposed Time Slots
          </label>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full bg-aurora-blue/20 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-aurora-blue" />
              </div>
              <div className="flex-1 flex gap-2">
                <input 
                  type="date"
                  className="flex-1 bg-white/5 border border-aurora-border rounded-lg px-3 py-2 text-sm text-white focus:border-aurora-blue outline-none"
                  value={slots[i].date}
                  onChange={(e) => handleUpdateSlot(i, 'date', e.target.value)}
                />
                <input 
                  type="time"
                  className="w-32 bg-white/5 border border-aurora-border rounded-lg px-3 py-2 text-sm text-white focus:border-aurora-blue outline-none"
                  value={slots[i].time}
                  onChange={(e) => handleUpdateSlot(i, 'time', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-8">
          <label className="text-xs font-semibold text-aurora-text-sec uppercase tracking-wider block">
            Include a supportive note
          </label>
          <textarea
            className="w-full bg-white/5 border border-aurora-border rounded-xl p-3.5 text-sm text-white placeholder:text-aurora-text-muted resize-none focus:outline-none focus:border-aurora-blue transition-colors"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 bg-aurora-blue hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {sending ? (
            <span className="animate-pulse">Sending...</span>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>{submitLabel ?? (mode === 'propose' ? 'Send new times' : 'Send Session Invite')}</span>
            </>
          )}
        </button>
        </div>
      </div>
    </ModalPortal>
  )
}