import { useState } from 'react'
import type { MoodLogEntryRow } from '../../services/mood/types'
import {
  ChevronDown, ChevronUp, Battery, Brain, Moon, Clock, Clock3,
  Droplets, UtensilsCrossed, ImageIcon, GraduationCap, X,
} from 'lucide-react'
import {
  getDurationCategoryLabel,
  getSchoolWorkloadBand,
  getSchoolWorkloadCaption,
  SCHOOL_TAGS,
} from '../../constants/mood/journalTemplates'

const DAY_DETAIL_ICONS: Record<string, string> = {
  joy: '😊', happy: '😊', sadness: '😢', sad: '😢',
  anger: '😠', angry: '😠', surprise: '😲', neutral: '😐',
  stressed: '😰', anxious: '😟', overwhelmed: '😩',
  relieved: '😌', productive: '🚀',
}

const EMOTION_BG: Record<string, string> = {
  joy: 'bg-green-900/30', happy: 'bg-green-900/30',
  sadness: 'bg-blue-900/30', sad: 'bg-blue-900/30',
  anger: 'bg-red-900/30', angry: 'bg-red-900/30',
  surprise: 'bg-orange-900/30', neutral: 'bg-gray-700/30',
  stressed: 'bg-orange-800/30', overwhelmed: 'bg-red-800/30',
  relieved: 'bg-emerald-900/30', productive: 'bg-cyan-900/30',
}

const EMOTION_COLOR: Record<string, string> = {
  joy: 'text-green-400', happy: 'text-green-400',
  sadness: 'text-blue-400', sad: 'text-blue-400',
  anger: 'text-red-400', angry: 'text-red-400',
  surprise: 'text-orange-400', neutral: 'text-gray-400',
  stressed: 'text-orange-500', overwhelmed: 'text-red-500',
  relieved: 'text-emerald-400', productive: 'text-cyan-400',
}

const EMOTION_DOT_COLOR: Record<string, string> = {
  joy: '#4ADE80', happy: '#4ADE80',
  sadness: '#60A5FA', sad: '#60A5FA',
  anger: '#F87171', angry: '#F87171',
  surprise: '#FB923C', neutral: '#94A3B8',
  stressed: '#F97316', overwhelmed: '#EF4444',
  relieved: '#34D399', productive: '#06B6D4',
}

function formatTime(date: Date) {
  if (!date) return ''
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function IntensityDots({ confidence, color }: { confidence: number; color: string }) {
  const filled = Math.round(confidence * 5)
  return (
    <div className="flex space-x-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{
            backgroundColor: i < filled ? color : 'rgba(148,163,184,0.25)',
          }}
        />
      ))}
    </div>
  )
}

interface StatTileProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}

function StatTile({ icon, label, value }: StatTileProps) {
  return (
    <div className="bg-aurora-bg/50 rounded-lg p-3 text-center border border-white/5">
      <div className="mx-auto mb-1 w-fit">{icon}</div>
      <p className="text-[10px] uppercase tracking-wider text-aurora-text-muted font-bold">{label}</p>
      <p className="text-sm font-bold text-white capitalize">{value}</p>
    </div>
  )
}

export function MoodLogEntry({
  entry,
  privacyMode = 'full',
}: {
  entry: MoodLogEntryRow
  privacyMode?: 'full' | 'baseline'
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)

  const isBaseline = privacyMode === 'baseline'
  const primaryEmotion = entry.mood?.toLowerCase() || 'neutral'
  const emotionLabel = primaryEmotion.charAt(0).toUpperCase() + primaryEmotion.slice(1)
  const bgClass = EMOTION_BG[primaryEmotion] || 'bg-gray-700/30'
  const textClass = EMOTION_COLOR[primaryEmotion] || 'text-gray-400'
  const dotColor = EMOTION_DOT_COLOR[primaryEmotion] || '#94A3B8'
  const confidence = entry.intensity / 10

  const entryDate = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp)
  const durationMin = entry.durationMinutes ?? 0
  const hasDuration = !isBaseline && durationMin > 0
  const hasBath = !isBaseline && typeof entry.bathTaken === 'boolean'
  const meals = isBaseline ? [] : (entry.mealResponses ?? [])
  const hasMeals = meals.length > 0
  const hasPhoto = !isBaseline && !!entry.journalImageUrl
  const hasAcademicInsight =
    !isBaseline && (
      !!entry.eventCategories?.includes('school') ||
      !!entry.eventTags?.some((t) => (SCHOOL_TAGS as readonly string[]).includes(t))
    )
  const schoolTagCount = (entry.eventTags ?? []).filter(
    (t) => (SCHOOL_TAGS as readonly string[]).includes(t),
  ).length

  return (
    <div className="card-aurora mb-3 overflow-hidden transition-all duration-300">
      {/* Minimized View (Always Visible) */}
      <div
        className="flex items-center space-x-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
      >
        <div className={`w-11 h-11 rounded-xl ${bgClass} flex items-center justify-center shrink-0`}>
          <span className="text-xl">{DAY_DETAIL_ICONS[primaryEmotion] || '😶'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold ${textClass}`}>{emotionLabel}</p>
          <div className="flex items-center text-sm text-aurora-text-muted mt-0.5">
            <Clock className="w-3.5 h-3.5 mr-1" />
            <span>{formatTime(entryDate)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-1">
            Intensity
          </p>
          <IntensityDots confidence={confidence} color={dotColor} />
        </div>
        <div className="ml-2 text-aurora-text-muted">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        isBaseline ? (
          <div className="px-4 pb-4 border-t border-white/5 pt-4 bg-white/2">
            <p className="text-xs text-aurora-text-muted leading-relaxed">
              You can only see this student's mood label, time, and intensity.
              Notes, wellness fields, meals, and photos unlock when this student
              is in your special population.
            </p>
          </div>
        ) : (
          <div className="px-4 pb-4 border-t border-white/5 pt-4 bg-white/2 space-y-4">

            {/* Vitals row 1: Stress / Energy / Sleep */}
            <div className="grid grid-cols-3 gap-3">
              <StatTile
                icon={<Brain className="w-4 h-4 text-orange-400" />}
                label="Stress"
                value={`${entry.stress}/5`}
              />
              <StatTile
                icon={<Battery className="w-4 h-4 text-emerald-400" />}
                label="Energy"
                value={`${entry.energy}/5`}
              />
              <StatTile
                icon={<Moon className="w-4 h-4 text-blue-400" />}
                label="Sleep"
                value={entry.sleepQuality || 'N/A'}
              />
            </div>

            {/* Vitals row 2: Duration / Bath (only when at least one is set) */}
            {(hasDuration || hasBath) && (
              <div className="grid grid-cols-2 gap-3">
                {hasDuration && (
                  <StatTile
                    icon={<Clock3 className="w-4 h-4 text-aurora-blue" />}
                    label="Mood Duration"
                    value={
                      <span>
                        {durationMin}m
                        <span className="block text-[10px] font-medium text-aurora-text-muted normal-case mt-0.5">
                          {getDurationCategoryLabel(durationMin)}
                        </span>
                      </span>
                    }
                  />
                )}
                {hasBath && (
                  <StatTile
                    icon={<Droplets className="w-4 h-4 text-aurora-blue" />}
                    label="Bath"
                    value={entry.bathTaken ? 'Taken' : 'Skipped'}
                  />
                )}
              </div>
            )}

            {/* Meals */}
            {hasMeals && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-aurora-amber" />
                  <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase">
                    Meals
                  </p>
                </div>
                <div className="space-y-1.5">
                  {meals.map((m) => (
                    <div
                      key={m.mealId}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-aurora-bg/50 border border-white/5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{m.mealLabel}</p>
                        <p className="text-[11px] text-aurora-text-muted">Around {m.mealTime}</p>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold tracking-wider uppercase px-2 py-1 rounded-md border shrink-0 ${m.taken ? 'bg-aurora-green/15 border-aurora-green/40 text-aurora-green' : 'bg-aurora-red/15 border-aurora-red/40 text-aurora-red'}`}
                      >
                        {m.taken ? 'Taken' : 'Not yet'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Context (categories + tags) */}
            {(entry.eventCategories?.length || entry.eventTags?.length) ? (
              <div>
                <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-2">
                  Context
                </p>
                <div className="flex flex-wrap gap-2">
                  {entry.eventCategories?.map((cat) => (
                    <span
                      key={cat}
                      className="px-2.5 py-1 rounded-full bg-aurora-blue/20 text-aurora-blue text-xs font-semibold border border-aurora-blue/30 capitalize"
                    >
                      {cat}
                    </span>
                  ))}
                  {entry.eventTags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full bg-white/10 text-aurora-text-sec text-xs border border-white/10"
                    >
                      {tag.replace('-', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Journal Note */}
            {entry.notes && (
              <div>
                <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-2">
                  Journal Note
                </p>
                <div className="p-3 bg-aurora-bg/50 rounded-lg border-l-4 border-aurora-purple/50 text-sm text-aurora-text-sec leading-relaxed">
                  {entry.notes}
                </div>
                {entry.journalSource && (
                  <p className="text-[10px] text-aurora-text-muted mt-1.5 italic">
                    {entry.journalSource === 'manual' ? 'Edited by you' : 'Auto-drafted from selections'}
                  </p>
                )}
              </div>
            )}

            {/* Photo */}
            {hasPhoto && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ImageIcon className="w-3.5 h-3.5 text-aurora-text-sec" />
                  <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase">
                    Photo
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoOpen(true)}
                  className="block w-full rounded-2xl overflow-hidden border border-white/10 bg-aurora-bg/50 cursor-pointer hover:border-white/20 transition-colors"
                  aria-label="Open photo"
                >
                  <img
                    src={entry.journalImageUrl}
                    alt="Mood log attachment"
                    loading="lazy"
                    className="w-full h-44 object-cover"
                  />
                </button>
              </div>
            )}

            {/* Academic Insight */}
            {hasAcademicInsight && (
              <div className="rounded-2xl border border-aurora-blue/30 bg-aurora-blue/8 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-aurora-blue" />
                  <p className="text-[10px] font-bold tracking-widest text-aurora-blue uppercase">
                    Academic insight
                  </p>
                </div>
                <p className="text-sm font-extrabold text-white">
                  {getSchoolWorkloadBand(schoolTagCount)}
                </p>
                <p className="text-xs text-aurora-text-sec mt-0.5">
                  {getSchoolWorkloadCaption(schoolTagCount)}
                </p>
                <p className="text-[10px] text-aurora-text-muted mt-2 leading-relaxed">
                  A read of how heavy school looked when you logged this entry. Self-report only — not a grade.
                </p>
              </div>
            )}

          </div>
        )
      )}

      {/* Photo lightbox */}
      {photoOpen && hasPhoto && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Mood log photo"
          onClick={() => setPhotoOpen(false)}
        >
          <button
            type="button"
            onClick={() => setPhotoOpen(false)}
            aria-label="Close photo"
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={entry.journalImageUrl}
            alt="Mood log attachment fullscreen"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  )
}