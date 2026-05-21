import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { usersService } from '../../services/users'
import { isCounselorSelectableByStudent } from '../../utils/counselorApprovalForAdmin'
import { LetterAvatar } from '../LetterAvatar'

export interface SelectableCounselor {
  id: string
  full_name?: string
  avatar_url?: string
}

interface SelectCounselorModalProps {
  visible: boolean
  studentId: string
  onClose: () => void
  onSelect: (counselor: SelectableCounselor) => void
}

export function SelectCounselorModal({
  visible,
  studentId,
  onClose,
  onSelect,
}: SelectCounselorModalProps) {
  const [counselors, setCounselors] = useState<SelectableCounselor[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible || !studentId) return
    setLoading(true)
    usersService
      .getCounselorsForStudent(studentId)
      .then((users) =>
        setCounselors(
          users.filter((u) =>
            isCounselorSelectableByStudent(u as unknown as Record<string, unknown>),
          ),
        ),
      )
      .catch(() => setCounselors([]))
      .finally(() => setLoading(false))
  }, [visible, studentId])

  useEffect(() => {
    if (!visible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  if (!visible) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 lg:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="select-counselor-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex w-full max-w-md max-h-[min(85dvh,560px)] flex-col rounded-t-2xl border border-white/10 bg-[#1a1a2e] shadow-xl lg:mb-0 lg:max-h-[min(80vh,560px)] lg:rounded-2xl mb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="shrink-0 px-5 pt-5 pb-0">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 lg:hidden" />
          <div className="mb-3 flex items-center justify-between">
            <h3 id="select-counselor-title" className="text-xl font-bold text-white">
              Message a counselor
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-[#7B8EC8] hover:bg-white/5 cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mb-4 text-sm text-[#9AA9C8]">
            Choose a counselor to start a conversation. You can send messages and request a session
            from the thread.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-blue border-t-transparent" />
            </div>
          ) : counselors.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#9AA9C8]">No counselors available.</p>
          ) : (
            <ul className="space-y-2 pb-2">
              {counselors.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(c)
                      onClose()
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#0f0f1a] p-3 text-left hover:border-aurora-blue/40 cursor-pointer"
                  >
                    <LetterAvatar
                      name={c.full_name || 'Counselor'}
                      size={44}
                      avatarUrl={c.avatar_url}
                    />
                    <span className="font-semibold text-white">{c.full_name || 'Counselor'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
