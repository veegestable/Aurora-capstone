import { getPastCollegeThreadBannerText } from '../../utils/conversationCollegeMessaging'

export function ConversationReadOnlyBanner({
  role,
}: {
  role: 'counselor' | 'student'
}) {
  return (
    <div className="mx-4 mt-2 mb-1 rounded-xl border border-amber-500/35 bg-amber-500/12 px-4 py-3">
      <p className="text-xs font-bold tracking-wide text-amber-300 uppercase">Read-only</p>
      <p className="mt-1 text-sm leading-relaxed text-[#C1CEE9]">
        {getPastCollegeThreadBannerText(role)}
      </p>
    </div>
  )
}
