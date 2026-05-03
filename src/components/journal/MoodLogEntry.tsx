import { useState } from 'react'
import type { MoodLogEntryRow } from '../../services/mood/types'
import { ChevronDown, ChevronUp, Battery, Brain, Moon, Clock } from 'lucide-react'

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

export function MoodLogEntry({ entry }: { entry: MoodLogEntryRow }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const primaryEmotion = entry.mood?.toLowerCase() || 'neutral'
  const emotionLabel = primaryEmotion.charAt(0).toUpperCase() + primaryEmotion.slice(1)
  const bgClass = EMOTION_BG[primaryEmotion] || 'bg-gray-700/30'
  const textClass = EMOTION_COLOR[primaryEmotion] || 'text-gray-400'
  const dotColor = EMOTION_DOT_COLOR[primaryEmotion] || '#94A3B8'
  const confidence = entry.intensity / 10
  
  const entryDate = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp)

  return (
    <div className="card-aurora mb-3 overflow-hidden transition-all duration-300">
      {/* Minimized View (Always Visible) */}
      <div 
        className="flex items-center space-x-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
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
        <div className="px-4 pb-4 border-t border-white/5 pt-4 bg-white/2">
          
          {/* Context (Stress, Energy, Sleep) */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-aurora-bg/50 rounded-lg p-3 text-center border border-white/5">
              <Brain className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <p className="text-[10px] uppercase tracking-wider text-aurora-text-muted font-bold">Stress</p>
              <p className="text-sm font-bold text-white">{entry.stress}/10</p>
            </div>
            <div className="bg-aurora-bg/50 rounded-lg p-3 text-center border border-white/5">
              <Battery className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-[10px] uppercase tracking-wider text-aurora-text-muted font-bold">Energy</p>
              <p className="text-sm font-bold text-white">{entry.energy}/10</p>
            </div>
            <div className="bg-aurora-bg/50 rounded-lg p-3 text-center border border-white/5">
              <Moon className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-[10px] uppercase tracking-wider text-aurora-text-muted font-bold">Sleep</p>
              <p className="text-sm font-bold text-white capitalize">{entry.sleepQuality || 'N/A'}</p>
            </div>
          </div>

          {/* Categories & Events */}
          {(entry.eventCategories?.length || entry.eventTags?.length) ? (
            <div className="mb-4">
              <p className="text-[10px] font-bold tracking-widest text-aurora-text-muted uppercase mb-2">
                Factors
              </p>
              <div className="flex flex-wrap gap-2">
                {entry.eventCategories?.map(cat => (
                  <span key={cat} className="px-2.5 py-1 rounded-full bg-aurora-blue/20 text-aurora-blue text-xs font-semibold border border-aurora-blue/30 capitalize">
                    {cat}
                  </span>
                ))}
                {entry.eventTags?.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-white/10 text-aurora-text-sec text-xs border border-white/10">
                    {tag}
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
              <div className="p-3 bg-aurora-bg/50 rounded-lg border-l-4 border-aurora-purple/50 text-sm text-aurora-text-sec">
                {entry.notes}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}