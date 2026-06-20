import { Eye, ExternalLink, Lock, Shield, X } from 'lucide-react'
import { ModalPortal } from '../common/ModalPortal'
import {
  MSUIIT_PRIVACY_POLICY_URL,
  STUDENT_PRIVACY_MESSAGES_DETAIL,
  STUDENT_PRIVACY_MODAL_INTRO,
  STUDENT_PRIVACY_MODAL_TITLE,
  STUDENT_PRIVACY_NARROW_DETAIL,
  STUDENT_PRIVACY_NARROW_TITLE,
  STUDENT_PRIVACY_VISIBLE_DETAIL,
  STUDENT_PRIVACY_VISIBLE_TITLE,
} from '../../constants/student-privacy'

type PrivacyAssuranceModalProps = {
  open: boolean
  onClose: () => void
}

function SectionBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="border-b border-white/8 py-4 last:border-b-0">
      <div className="mb-2 flex items-center gap-2.5">
        {icon}
        <h4 className="text-[15px] font-bold text-white">{title}</h4>
      </div>
      <p className="text-[13px] leading-relaxed text-aurora-text-sec">{body}</p>
    </div>
  )
}

export function PrivacyAssuranceModal({ open, onClose }: PrivacyAssuranceModalProps) {
  return (
    <ModalPortal open={open}>
      <div
        className="fixed inset-0 z-100 flex items-end justify-center sm:items-center sm:p-5"
        style={{ backgroundColor: 'rgba(3,8,24,0.55)' }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={STUDENT_PRIVACY_MODAL_TITLE}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/8 bg-aurora-bg-deep sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Shield className="h-5 w-5 text-aurora-secondary-blue" />
              <h3 className="text-lg font-extrabold text-white">
                {STUDENT_PRIVACY_MODAL_TITLE}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-aurora-text-sec transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
              aria-label="Close privacy information"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto px-5 pb-6">
            <p className="mt-4 text-[13px] leading-relaxed text-aurora-text-sec">
              {STUDENT_PRIVACY_MODAL_INTRO}
            </p>

            <div className="card-aurora mt-4 px-5 py-1">
              <SectionBlock
                icon={<Eye className="h-[18px] w-[18px] text-aurora-accent-green" />}
                title={STUDENT_PRIVACY_VISIBLE_TITLE}
                body={STUDENT_PRIVACY_VISIBLE_DETAIL}
              />
              <SectionBlock
                icon={<Lock className="h-[18px] w-[18px] text-aurora-secondary-blue" />}
                title={STUDENT_PRIVACY_NARROW_TITLE}
                body={STUDENT_PRIVACY_NARROW_DETAIL}
              />
              <SectionBlock
                icon={<Shield className="h-[18px] w-[18px] text-aurora-secondary-blue" />}
                title="Messages & sessions"
                body={STUDENT_PRIVACY_MESSAGES_DETAIL}
              />
            </div>

            <a
              href={MSUIIT_PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-bold tracking-wide text-aurora-secondary-blue hover:underline"
            >
              READ MSU-IIT PRIVACY POLICY
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-aurora-secondary-blue py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-aurora-secondary-dark-blue cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
