import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { moodService } from '../../services/mood'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Types 
interface MoodEntry {
  id: string
  emotions: Array<{ emotion: string; confidence: number; color: string }>
  energy_level: number
  stress_level: number
  notes: string
  log_date: Date
  created_at?: Date
}

interface CalendarDay {
  date: Date
  moods: MoodEntry[]
  isCurrentMonth: boolean
  isToday: boolean
  blendedColor?: string
}

// Constants 
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

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Helpers 
function getBlendedColor(moods: MoodEntry[]): string | undefined {
  if (!moods?.length) return undefined
  let rT = 0, gT = 0, bT = 0, wT = 0
  moods.forEach((mood) =>
    mood.emotions.forEach((e) => {
      const hex = (e.color || '#94A3B8').replace('#', '')
      rT += parseInt(hex.substring(0, 2), 16) * (e.confidence || 1)
      gT += parseInt(hex.substring(2, 4), 16) * (e.confidence || 1)
      bT += parseInt(hex.substring(4, 6), 16) * (e.confidence || 1)
      wT += e.confidence || 1
    })
  )
  if (!wT) return undefined
  return `rgb(${Math.round(rT / wT)},${Math.round(gT / wT)},${Math.round(bT / wT)})`
}

function formatTime(date: Date) {
  if (!date) return ''
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// Intensity Dots 
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

// Day Entry Row 
function DayEntryRow({ entry }: { entry: MoodEntry }) {
  const primaryEmotion = entry.emotions?.[0]?.emotion?.toLowerCase() || 'neutral'
  const emotionLabel = primaryEmotion.charAt(0).toUpperCase() + primaryEmotion.slice(1)
  const bgClass = EMOTION_BG[primaryEmotion] || 'bg-gray-700/30'
  const textClass = EMOTION_COLOR[primaryEmotion] || 'text-gray-400'
  const dotColor = EMOTION_DOT_COLOR[primaryEmotion] || '#94A3B8'
  const confidence = entry.emotions?.[0]?.confidence || 0.5
  const contextLabel = entry.notes
    ? entry.notes.split(' ').slice(0, 4).join(' ')
    : 'No context'

  return (
    <div className="card-aurora flex items-center space-x-3 mb-3">
      <div className={`w-11 h-11 rounded-xl ${bgClass} flex items-center justify-center shrink-0`}>
        <span className="text-xl">{DAY_DETAIL_ICONS[primaryEmotion] || '😶'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold ${textClass}`}>{emotionLabel}</p>
        <p className="text-sm text-aurora-gray-500 truncate">
          {formatTime(entry.log_date)} • {contextLabel}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] font-bold tracking-widest text-aurora-gray-400 uppercase mb-1">
          Intensity
        </p>
        <IntensityDots confidence={confidence} color={dotColor} />
      </div>
    </div>
  )
}

// Main History Page 
export default function History() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [moodData, setMoodData] = useState<MoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  useEffect(() => {
    if (user) loadMoodData()
  }, [currentDate, user])

  const loadMoodData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      const data = await moodService.getMoodLogs(user.id, start.toISOString(), end.toISOString())
      setMoodData(Array.isArray(data) ? data : [])
    } catch {
      setMoodData([])
    } finally {
      setLoading(false)
    }
  }

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDay = new Date(firstDay)
    startDay.setDate(startDay.getDate() - startDay.getDay())
    const today = new Date()
    const days: CalendarDay[] = []

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDay)
      date.setDate(startDay.getDate() + i)
      const ds = date.toISOString().split('T')[0]
      const dayMoods = moodData.filter((m) => {
        if (!m?.log_date) return false
        return (
          (m.log_date instanceof Date ? m.log_date : new Date(m.log_date))
            .toISOString()
            .split('T')[0] === ds
        )
      })
      days.push({
        date,
        moods: dayMoods,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        blendedColor: getBlendedColor(dayMoods),
      })
    }
    return days
  }

  const navigateMonth = (dir: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1))
      return d
    })
    setSelectedDay(null)
  }

  const calendarDays = generateCalendarDays()
  const monthLabel = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-aurora-primary-dark font-heading">
          Aurora Mood Blend
        </h2>
        <p className="text-aurora-gray-500 text-sm">
          Your emotional journey — tap a colored day to see details.
        </p>
      </div>

      {/* Calendar Card */}
      <div className="card-aurora">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-aurora-gray-100 transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-aurora-gray-500" />
          </button>
          <span className="text-lg font-bold text-aurora-primary-dark">
            {monthLabel}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg hover:bg-aurora-gray-100 transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-aurora-gray-500" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEK_DAYS.map((d, i) => (
            <span
              key={i}
              className="text-center text-xs font-bold text-aurora-gray-400"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const isSelected =
                selectedDay?.date.toDateString() === day.date.toDateString()

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(day)}
                  className="aspect-square flex items-center justify-center p-0.5 cursor-pointer"
                  aria-label={`${day.date.toLocaleDateString()}, ${day.moods.length} entries`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all ${
                      !day.isCurrentMonth ? 'opacity-25' : ''
                    } ${isSelected ? 'ring-2 ring-aurora-secondary-blue' : ''} ${
                      !day.blendedColor && day.isToday
                        ? 'bg-aurora-secondary-blue/20 font-bold text-aurora-secondary-blue'
                        : !day.blendedColor
                          ? 'text-aurora-gray-500 hover:bg-aurora-gray-100'
                          : 'font-bold text-white'
                    }`}
                    style={
                      day.blendedColor
                        ? { backgroundColor: day.blendedColor }
                        : undefined
                    }
                  >
                    {day.date.getDate()}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Day Details */}
      {selectedDay ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-aurora-primary-dark">
              Day Details
            </h3>
            <span className="text-sm font-semibold text-aurora-secondary-blue">
              {selectedDay.date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          {selectedDay.moods.length > 0 ? (
            selectedDay.moods.map((entry, i) => (
              <DayEntryRow key={i} entry={entry} />
            ))
          ) : (
            <div className="card-aurora text-center py-6">
              <p className="text-aurora-gray-500">No entries for this day.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card-aurora text-center py-6">
          <p className="text-aurora-gray-500">
            Tap a colored day on the calendar to see your mood entries.
          </p>
        </div>
      )}
    </div>
  )
}