import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { moodService } from '../../services/mood'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { MoodLogEntryRow } from '../../services/mood/types'
import { MoodLogEntry } from './MoodLogEntry'
import { getEmotionColor } from '../../utils/moodColors'
import { MANUAL_EMOTIONS } from '../../utils/emotions'

interface CalendarDay {
  date: Date
  moods: MoodLogEntryRow[]
  isCurrentMonth: boolean
  isToday: boolean
  blendedColor?: string
}

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function getBlendedColor(moods: MoodLogEntryRow[]): string | undefined {
  if (!moods?.length) return undefined
  let rT = 0, gT = 0, bT = 0, wT = 0
  moods.forEach((mood) => {
    const hex = getEmotionColor(mood.mood).replace('#', '')
    const confidence = mood.intensity / 10
    rT += parseInt(hex.substring(0, 2), 16) * confidence
    gT += parseInt(hex.substring(2, 4), 16) * confidence
    bT += parseInt(hex.substring(4, 6), 16) * confidence
    wT += confidence
  })
  if (!wT) return undefined
  return `rgb(${Math.round(rT / wT)},${Math.round(gT / wT)},${Math.round(bT / wT)})`
}

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export type JournalCalendarProps = {
  /** When set (e.g. counselor view), loads this user's mood logs instead of the signed-in student. */
  forUserId?: string
  /** When 'baseline', day-detail entries hide notes / wellness / photo / context. Default 'full'. */
  privacyMode?: 'full' | 'baseline'
}

export function JournalCalendar({
  forUserId,
  privacyMode = 'full',
}: JournalCalendarProps = {}) {
  const { user } = useAuth()
  const targetUserId = forUserId ?? user?.id
  const [currentDate, setCurrentDate] = useState(new Date())
  const [moodData, setMoodData] = useState<MoodLogEntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  useEffect(() => {
    if (targetUserId) void loadMoodData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, targetUserId])

  const loadMoodData = async () => {
    if (!targetUserId) return
    setLoading(true)
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999)
      const data = await moodService.getMoodLogs(targetUserId, start.toISOString(), end.toISOString())
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
      const ds = toLocalDateStr(date)
      const dayMoods = moodData.filter((m) => {
        if (!m?.timestamp) return false
        const mDate = m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
        return toLocalDateStr(mDate) === ds
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

  if (!targetUserId) {
    return (
      <div className="card-aurora p-6 text-center text-aurora-text-muted text-sm">
        Sign in to view the journal calendar.
      </div>
    )
  }

  const emptyDayHint = forUserId
    ? 'Tap a day on the calendar to see this student\'s mood entries.'
    : 'Tap a day on the calendar to see your mood entries.'

  return (
    <div className="space-y-6">
      {/* Calendar Card */}
      <div className="card-aurora p-5">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-aurora-text-muted hover:text-white"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold text-white font-heading tracking-wide">
            {monthLabel}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-aurora-text-muted hover:text-white"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEK_DAYS.map((d, i) => (
            <span
              key={i}
              className="text-center text-xs font-bold text-aurora-text-muted uppercase tracking-wider"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-aurora-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const isSelected = selectedDay?.date.toDateString() === day.date.toDateString()

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(day)}
                  className={`aspect-square flex items-center justify-center rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                    isSelected ? 'border-aurora-blue bg-[rgba(45,107,255,0.1)] scale-105 shadow-lg' : 'border-transparent hover:bg-white/5'
                  } ${!day.isCurrentMonth ? 'opacity-30' : ''}`}
                  aria-label={`${day.date.toLocaleDateString()}, ${day.moods.length} entries`}
                >
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition-all ${
                      day.blendedColor
                        ? 'text-white shadow-[0_2px_10px_rgba(0,0,0,0.2)]'
                        : day.isToday
                          ? 'text-aurora-blue bg-aurora-blue/10 border border-aurora-blue/30'
                          : 'text-aurora-text-sec'
                    }`}
                    style={day.blendedColor ? { backgroundColor: day.blendedColor } : undefined}
                  >
                    {day.date.getDate()}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-2 hidden sm:flex items-center justify-center gap-4 flex-wrap text-xs font-semibold text-aurora-text-sec">
        {MANUAL_EMOTIONS.map(e => (
          <div key={e.name} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getEmotionColor(e.name) }} />
            <span>{e.label}</span>
          </div>
        ))}
      </div>

      {/* Day Details */}
      {selectedDay ? (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-bold text-white font-heading">
              Mood Log Entries
            </h3>
            <span className="text-sm font-semibold text-aurora-blue bg-aurora-blue/10 px-3 py-1 rounded-full border border-aurora-blue/20">
              {selectedDay.date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          {selectedDay.moods.length > 0 ? (
            <div className="space-y-3">
              {selectedDay.moods.map((entry, i) => (
                <MoodLogEntry key={i} entry={entry} privacyMode={privacyMode} />
              ))}
            </div>
          ) : (
            <div className="card-aurora text-center py-8 border-dashed border-white/10">
              <p className="text-aurora-text-muted font-medium">{emptyDayHint}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card-aurora text-center py-8 border-dashed border-white/10 mt-6">
          <p className="text-aurora-text-muted font-medium">
            Tap a day on the calendar to see your mood entries.
          </p>
        </div>
      )}
    </div>
  )
}