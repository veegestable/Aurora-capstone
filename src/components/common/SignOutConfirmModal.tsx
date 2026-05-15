import { LogOut, Loader2 } from 'lucide-react'

interface SignOutConfirmModalProps {
  visible: boolean
  onStay: () => void
  onLeave: () => void | Promise<void>
  leaving?: boolean
}

/**
 * Sign-out confirmation modal — dark card, "No, stay" / "Yes, leave" buttons,
 * loading spinner on leave, LogOut icon accent.
 */
export function SignOutConfirmModal({
  visible,
  onStay,
  onLeave,
  leaving = false,
}: SignOutConfirmModalProps) {
  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-5"
      style={{ backgroundColor: 'rgba(3,8,24,0.55)' }}
      onClick={() => { if (!leaving) onStay() }}
      role="dialog"
      aria-modal="true"
      aria-label="Sign out confirmation"
    >
      <div
        className="w-full max-w-[420px] bg-aurora-card border border-white/8 rounded-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-3">
          <div className="w-[58px] h-[58px] rounded-3xl flex items-center justify-center">
            <LogOut className="w-[42px] h-[42px] text-aurora-red" strokeWidth={2.25} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-extrabold text-white text-center mb-2">
          Sign out?
        </h3>

        {/* Body */}
        <p className="text-[13px] leading-[19px] text-aurora-text-sec text-center mb-4">
          Are you sure you want to sign out? You will need to sign in again to
          continue using Aurora.
        </p>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={() => { if (!leaving) onStay() }}
            disabled={leaving}
            className="flex-1 min-h-[40px] rounded-full px-3 py-2.5
                       bg-[rgba(124,58,237,0.18)] border border-[rgba(124,58,237,0.45)]
                       text-white text-[13px] font-bold
                       hover:bg-[rgba(124,58,237,0.28)] transition-colors cursor-pointer
                       disabled:opacity-70"
            aria-label="No, stay"
          >
            No, stay
          </button>
          <button
            onClick={() => { if (!leaving) void onLeave() }}
            disabled={leaving}
            className="flex-1 min-h-[40px] rounded-full px-3 py-2.5
                       bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.45)]
                       text-aurora-red text-[13px] font-bold
                       hover:bg-[rgba(239,68,68,0.22)] transition-colors cursor-pointer
                       disabled:opacity-70 flex items-center justify-center"
            aria-label="Yes, leave"
          >
            {leaving ? (
              <Loader2 className="w-4 h-4 animate-spin text-aurora-red" />
            ) : (
              'Yes, leave'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}