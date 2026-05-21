import { CircleHelp, X } from 'lucide-react'

export type HintKey =
  | 'manual' | 'intensity' | 'duration' | 'energy' | 'stress'
  | 'sleep' | 'bath' | 'meal' | 'schoolPressure' | 'journal' | 'photo' | null

const HINTS: Record<Exclude<HintKey, null>, { title: string; body: string }> = {
  manual: {
    title: 'Manual Check-in',
    body: 'Pick the emotion that fits best right now. You can fine-tune intensity and how long it has been with you in the next two controls.',
  },
  intensity: {
    title: 'Intensity scale (1–10)',
    body: 'How strongly you feel the selected emotion right now.\n\n• 1–3: Mild\n• 4–6: Noticeable\n• 7–8: Strong\n• 9–10: Very intense\n\nUse the number that matches how strong it feels — not whether it is good or bad.',
  },
  duration: {
    title: 'Duration categories guide',
    body: 'These labels help classify your entered minutes:\n\n- Less than 15 mins: Just a moment\n- 15 to 60 mins: About an hour\n- 61 to 180 mins: A few hours\n- 181 to 480 mins: Most of the day\n- 481+ mins: All day / Ongoing',
  },
  energy: {
    title: 'Energy scale (1–5)',
    body: 'How much fuel you have in the tank right now.\n\n1 - Exhausted\n2 - Low\n3 - Steady\n4 - High\n5 - Energized',
  },
  stress: {
    title: 'Stress scale (1–5)',
    body: 'How pressured or tense you feel right now.\n\n1 - Very calm\n2 - A little tense\n3 - Moderately tense\n4 - Very tense\n5 - Overwhelmed',
  },
  sleep: {
    title: 'Sleep quality',
    body: 'A quick summary of last night. Logged once per day — once you tap a choice it locks for the rest of today.',
  },
  bath: {
    title: 'Bath check-in',
    body: 'Tracks whether you have bathed today. The chip locks once a "Yes" is logged for the day so you only confirm it once.',
  },
  meal: {
    title: 'Meal check-in guide',
    body: 'Track if each scheduled meal is already taken.\n\nThis schedule comes from your Profile settings.\nTo set or edit meal times, go to:\nProfile → Meal Schedule\n\n- Taken: you already had this meal. Once saved for today, it stays Taken (like bath) until tomorrow.\n- Not yet: you have not had it yet — you can change this on a later check-in today if you need to.\n\nFuture meal slots are locked until their scheduled time.',
  },
  schoolPressure: {
    title: 'School pressure today',
    body: 'This is an estimate based on the school-related tags you selected in this check-in. It helps summarize how much school may have influenced your mood today.',
  },
  journal: {
    title: 'Automatic journal draft',
    body: 'Aurora can generate a short draft for your journal note to help you start quickly.\n\nIf you selected context tags, the draft is generated from those tags. When you see it as “Auto-draft”, you can edit the text freely before saving. If you make changes, it becomes “Edited”.\n\nYour final saved note is always what you leave in the journal editor.',
  },
  photo: {
    title: 'Photo attachment',
    body: 'Optional. Add a photo that captures something from your day — a place, an object, a moment. Stored privately with this check-in.',
  },
}

interface HintButtonProps {
  hint: Exclude<HintKey, null>
  active: HintKey
  onToggle: (next: HintKey) => void
  ariaLabel?: string
}

export function HintButton({ hint, active, onToggle, ariaLabel }: HintButtonProps) {
  const isOpen = active === hint
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? `Show ${hint} hint`}
      onClick={() => onToggle(isOpen ? null : hint)}
      className="p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
    >
      <CircleHelp className={`w-4 h-4 ${isOpen ? 'text-aurora-blue' : 'text-aurora-text-muted'}`} />
    </button>
  )
}

export function HintPanel({ hint, onClose }: { hint: Exclude<HintKey, null>; onClose: () => void }) {
  const { title, body } = HINTS[hint]
  return (
    <div className="card-aurora border-aurora-blue/30 bg-[rgba(45,107,255,0.08)] p-4 max-w-sm mx-auto animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start gap-2">
        <CircleHelp className="w-4 h-4 text-aurora-blue mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-1">{title}</p>
          <p className="text-xs text-aurora-text-sec whitespace-pre-line leading-relaxed">{body}</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss hint"
          onClick={onClose}
          className="p-1 -mr-1 -mt-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5 text-aurora-text-muted" />
        </button>
      </div>
    </div>
  )
}