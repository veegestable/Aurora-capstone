import { useEffect, useMemo, useState } from 'react'
import {
  GraduationCap, ShieldPlus, Users, PartyPopper, Briefcase,
  ChevronDown, ChevronUp, MessageSquare, Camera, Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useUserDaySettings } from '../../contexts/UserDaySettingsContext'
import {
  getEnabledContextCategories,
  getSchoolWorkloadBand,
  getSchoolWorkloadCaption,
  type CategoryConfig,
} from '../../constants/mood/journalTemplates'
import type { ContextCategoryKey } from '../../services/mood/types'
import { HintButton, HintPanel, type HintKey } from './HintSystem'

const CATEGORY_ICONS: Record<ContextCategoryKey, { icon: LucideIcon; colorClass: string }> = {
  school: { icon: GraduationCap, colorClass: 'text-aurora-blue' },
  health: { icon: ShieldPlus, colorClass: 'text-aurora-green' },
  social: { icon: Users, colorClass: 'text-aurora-purple' },
  fun: { icon: PartyPopper, colorClass: 'text-aurora-amber' },
  productivity: { icon: Briefcase, colorClass: 'text-aurora-red' },
}

function formatTagLabel(tag: string): string {
  return tag.replace(/-/g, ' ')
}

interface StepContextProps {
  selectedTags: string[]
  toggleTag: (tag: string) => void
  schoolTagCount: number
  notes: string
  setNotes: (v: string) => void
  journalEdited: boolean
  setJournalEdited: (v: boolean) => void
  journalImage: File | null
  setJournalImage: (f: File | null) => void
  activeHint: HintKey
  onHintToggle: (next: HintKey) => void
}

export function StepContext({
  selectedTags, toggleTag, schoolTagCount,
  notes, setNotes, journalEdited, setJournalEdited,
  journalImage, setJournalImage,
  activeHint, onHintToggle,
}: StepContextProps) {
  const { settings } = useUserDaySettings()
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [showJournalEditor, setShowJournalEditor] = useState(false)

  const categories = useMemo(
    () => getEnabledContextCategories(settings),
    [settings],
  )

  const workloadBand = getSchoolWorkloadBand(schoolTagCount)
  const schoolTagCaption = getSchoolWorkloadCaption(schoolTagCount)

  const photoPreview = useMemo(
    () => (journalImage ? URL.createObjectURL(journalImage) : null),
    [journalImage],
  )
  useEffect(() => {
    if (!photoPreview) return
    return () => URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  const journalPreview = notes.trim() || (
    selectedTags.length > 0
      ? 'Your auto-draft will appear here after you select tags.'
      : 'Add your reflection here...'
  )

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-extrabold text-white mb-2">What affected your mood?</h2>
        <p className="text-sm text-aurora-text-sec">Select tags that influenced how you felt today.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-aurora-card-alt px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-[#9CB0DE]">School pressure today</span>
            <HintButton hint="schoolPressure" active={activeHint} onToggle={onHintToggle} ariaLabel="School pressure hint" />
          </div>
          <span className="text-sm font-bold text-aurora-blue shrink-0">{workloadBand}</span>
        </div>
        <p className="text-[11px] text-aurora-text-muted mt-1.5">{schoolTagCaption}</p>
      </div>
      {activeHint === 'schoolPressure' && (
        <HintPanel hint="schoolPressure" onClose={() => onHintToggle(null)} />
      )}

      {categories.length === 0 ? (
        <div className="card-aurora p-4">
          <p className="text-sm text-aurora-text-sec">No categories enabled. You can turn them on in Settings.</p>
        </div>
      ) : (
        categories.map((category: CategoryConfig) => (
          <CategoryAccordion
            key={category.key}
            category={category}
            expanded={!!expandedGroups[category.key]}
            onToggle={() => toggleGroup(category.key)}
            selectedTags={selectedTags}
            onTagToggle={toggleTag}
          />
        ))
      )}

      <div className="card-aurora p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-4 h-4 text-aurora-blue shrink-0" />
            <p className="text-sm font-bold text-white">
              Quick Note <span className="text-aurora-text-muted font-medium">(optional)</span>
            </p>
          </div>
          <div className="flex items-center shrink-0">
            <span className="text-[11px] text-aurora-text-muted">{journalEdited ? 'Edited' : 'Auto-draft'}</span>
            <HintButton hint="journal" active={activeHint} onToggle={onHintToggle} ariaLabel="Journal draft hint" />
          </div>
        </div>
        {activeHint === 'journal' && (
          <HintPanel hint="journal" onClose={() => onHintToggle(null)} />
        )}

        {!showJournalEditor ? (
          <>
            <div className="rounded-[10px] border border-white/10 bg-aurora-card-alt p-2.5 mb-2">
              <p className="text-[13px] leading-relaxed text-aurora-text-muted line-clamp-4">{journalPreview}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowJournalEditor(true)}
              className="px-3 py-1.5 rounded-full border border-aurora-blue bg-[rgba(45,107,255,0.18)] text-xs font-bold text-aurora-blue cursor-pointer hover:bg-[rgba(45,107,255,0.28)] transition-colors"
            >
              {selectedTags.length > 0 ? 'Edit draft' : 'Write note'}
            </button>
          </>
        ) : (
          <>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setJournalEdited(true) }}
              rows={4}
              placeholder="Write your reflection..."
              className="w-full min-h-[94px] p-2.5 mb-2 bg-aurora-card-alt border border-white/10 rounded-[10px] text-white text-sm placeholder:text-aurora-text-muted focus:outline-hidden focus:border-aurora-blue/50 resize-none"
            />
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setJournalEdited(false)
                  if (selectedTags.length > 0) return
                  setNotes('')
                }}
                className="px-3 py-1.5 rounded-full border border-white/10 bg-aurora-card-alt text-xs font-bold text-aurora-text-sec cursor-pointer hover:bg-white/10 transition-colors"
              >
                {selectedTags.length > 0 ? 'Use auto draft' : 'Clear note'}
              </button>
              <button
                type="button"
                onClick={() => setShowJournalEditor(false)}
                className="px-3 py-1.5 rounded-full border border-aurora-blue bg-[rgba(45,107,255,0.18)] text-xs font-bold text-aurora-blue cursor-pointer hover:bg-[rgba(45,107,255,0.28)] transition-colors"
              >
                Done editing
              </button>
            </div>
          </>
        )}

        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-4 h-4 text-aurora-blue" />
            <p className="text-sm font-bold text-white">
              Photo <span className="text-aurora-text-muted font-medium">(optional)</span>
            </p>
          </div>
          {photoPreview ? (
            <div className="relative rounded-[10px] overflow-hidden border border-white/10 mb-2">
              <img src={photoPreview} alt="Attached preview" className="w-full aspect-3/4 object-cover" />
              <button
                type="button"
                onClick={() => setJournalImage(null)}
                className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-[11px] font-bold text-white border border-white/15 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          ) : null}
          <label className="inline-flex px-3 py-1.5 rounded-full border border-aurora-blue bg-[rgba(45,107,255,0.18)] text-xs font-bold text-aurora-blue cursor-pointer hover:bg-[rgba(45,107,255,0.28)] transition-colors">
            {journalImage ? 'Change photo' : 'Add photo'}
            <input
              type="file" accept="image/*" className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setJournalImage(file)
                e.currentTarget.value = ''
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

function CategoryAccordion({
  category, expanded, onToggle, selectedTags, onTagToggle,
}: {
  category: CategoryConfig
  expanded: boolean
  onToggle: () => void
  selectedTags: string[]
  onTagToggle: (tag: string) => void
}) {
  const { icon: Icon, colorClass } = CATEGORY_ICONS[category.key]

  return (
    <div className="card-aurora p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${colorClass}`} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">{category.title}</p>
            <p className="text-xs text-aurora-text-muted">{category.helper}</p>
          </div>
        </div>
        {category.tags.length > 0 && (
          <button
            type="button"
            onClick={onToggle}
            className="p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${category.title}` : `Expand ${category.title}`}
          >
            {expanded ? (
              <ChevronUp className="w-[18px] h-[18px] text-aurora-blue" />
            ) : (
              <ChevronDown className="w-[18px] h-[18px] text-aurora-blue" />
            )}
          </button>
        )}
      </div>
      {expanded && category.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 animate-in fade-in duration-200">
          {category.tags.map((tag) => {
            const selected = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onTagToggle(tag)}
                aria-pressed={selected}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                  selected
                    ? 'bg-[rgba(45,107,255,0.22)] border-[rgba(88,138,255,0.6)] text-[#C8D8FF]'
                    : 'bg-[rgba(28,36,86,0.55)] border-[rgba(120,139,198,0.25)] text-[#AFC0E8] hover:border-white/20'
                }`}
              >
                {formatTagLabel(tag)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
