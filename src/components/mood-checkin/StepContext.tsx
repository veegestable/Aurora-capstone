import { useEffect, useMemo } from 'react'
import { PenLine, TrendingUp, ImagePlus, Trash2 } from 'lucide-react'
import { CONTEXT_CATEGORIES } from '../../hooks/useMoodCheckIn'
import { HintButton, HintPanel, type HintKey } from './HintSystem'

type PressureLabel = 'Light' | 'Steady' | 'Heavy' | 'Intense'

const PRESSURE_PILL_STYLE: Record<PressureLabel, string> = {
  Light: 'bg-[rgba(34,197,94,0.15)] border-[rgba(34,197,94,0.4)] text-aurora-green',
  Steady: 'bg-[rgba(45,107,255,0.15)] border-[rgba(45,107,255,0.4)] text-aurora-blue',
  Heavy: 'bg-[rgba(254,189,3,0.15)] border-[rgba(254,189,3,0.4)] text-aurora-amber',
  Intense: 'bg-[rgba(239,68,68,0.15)] border-[rgba(239,68,68,0.4)] text-aurora-red',
}

interface StepContextProps {
  selectedTags: string[]
  toggleTag: (tag: string) => void
  pressureLabel: PressureLabel
  notes: string
  setNotes: (v: string) => void
  setJournalEdited: (v: boolean) => void
  journalImage: File | null
  setJournalImage: (f: File | null) => void
  activeHint: HintKey
  onHintToggle: (next: HintKey) => void
}

export function StepContext({
  selectedTags, toggleTag, pressureLabel,
  notes, setNotes, setJournalEdited,
  journalImage, setJournalImage,
  activeHint, onHintToggle,
}: StepContextProps) {
  const photoPreview = useMemo(
    () => (journalImage ? URL.createObjectURL(journalImage) : null),
    [journalImage],
  )
  useEffect(() => {
    if (!photoPreview) return
    return () => URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white mb-2">What's going on?</h2>
        <p className="text-sm text-aurora-text-sec">Select tags that describe your day.</p>
      </div>

      {/* Pressure pill */}
      <div className="flex items-center justify-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-extrabold tracking-wide ${PRESSURE_PILL_STYLE[pressureLabel]}`}>
          <TrendingUp className="w-3.5 h-3.5" />
          Pressure: {pressureLabel}
        </span>
        <HintButton hint="pressure" active={activeHint} onToggle={onHintToggle} ariaLabel="Pressure hint" />
      </div>
      {activeHint === 'pressure' && <HintPanel hint="pressure" onClose={() => onHintToggle(null)} />}

      {/* Context tag categories */}
      <div className="space-y-7">
        {CONTEXT_CATEGORIES.map((category) => (
          <div key={category.key}>
            <h4 className="text-sm font-semibold text-white mb-3 pl-1">{category.title}</h4>
            <div className="flex flex-wrap gap-2.5">
              {category.tags.map((tag) => {
                const isSelected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[rgba(45,107,255,0.2)] text-aurora-blue border-aurora-blue shadow-[0_0_10px_rgba(45,107,255,0.2)]'
                        : 'bg-white/5 text-aurora-text-sec border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {tag.replace('-', ' ')}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Photo attachment */}
      <div className="card-aurora p-5">
        <div className="flex items-center gap-2 mb-3 pl-1">
          <ImagePlus className="w-4 h-4 text-aurora-text-sec" />
          <label className="text-sm font-semibold text-white">Photo (optional)</label>
          <HintButton hint="photo" active={activeHint} onToggle={onHintToggle} ariaLabel="Photo hint" />
        </div>

        {photoPreview ? (
          <div className="relative rounded-2xl overflow-hidden border border-white/10">
            <img src={photoPreview} alt="Attached preview" className="w-full h-48 object-cover" />
            <button
              type="button"
              onClick={() => setJournalImage(null)}
              className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-xs font-bold text-white border border-white/15 cursor-pointer"
              aria-label="Remove photo"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border border-dashed border-white/15 bg-white/0.02 hover:bg-white/5 transition-colors cursor-pointer">
            <ImagePlus className="w-5 h-5 text-aurora-text-sec" />
            <span className="text-sm font-semibold text-aurora-text-sec">Tap to attach a photo</span>
            <span className="text-[11px] font-medium text-aurora-text-muted">
              JPG or PNG · stored privately with this entry
            </span>
            <input
              type="file" accept="image/*" className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setJournalImage(file)
                e.currentTarget.value = ''
              }}
            />
          </label>
        )}
      </div>
      {activeHint === 'photo' && <HintPanel hint="photo" onClose={() => onHintToggle(null)} />}

      {/* Journal draft */}
      <div className="mt-2 pt-6 border-t border-white/10">
        <div className="flex items-center gap-2 mb-3 pl-1">
          <PenLine className="w-4 h-4 text-aurora-text-sec" />
          <label htmlFor="mood-journal" className="text-sm font-semibold text-white">
            Journal Draft (Auto-filled)
          </label>
        </div>
        <textarea
          id="mood-journal"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setJournalEdited(true) }}
          className="w-full h-32 p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-aurora-text-muted focus:outline-hidden focus:border-aurora-blue/50 focus:bg-white/10 transition-colors resize-none"
          placeholder="Add more details about your day..."
        />
      </div>
    </div>
  )
}