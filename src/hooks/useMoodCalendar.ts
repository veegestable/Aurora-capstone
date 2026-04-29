import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { moodService } from '../services/mood'
import type { MoodLogEntryRow } from '../services/mood/types'
import { getBlendedColorWeighted } from '../utils/moodColors'

export interface CalendarDay {
  date: Date
  moods: MoodLogEntryRow[]
  isCurrentMonth: boolean
  isToday: boolean
  blendedColor?: string
}

export function useMoodCalendar() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [moodData, setMoodData] = useState<MoodLogEntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  useEffect(() => {
    if (user) {
      loadMoodData()
    }
  }, [currentDate, user])

  const loadMoodData = async () => {
    if (!user) return
    try {
      setLoading(true)
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const data = await moodService.getMoodLogs(
        user.id,
        startOfMonth.toISOString(),
        endOfMonth.toISOString()
      )

      setMoodData(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading mood data:', error)
      setMoodData([])
    } finally {
      setLoading(false)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const firstDayOfCalendar = new Date(firstDayOfMonth)
    firstDayOfCalendar.setDate(firstDayOfCalendar.getDate() - firstDayOfCalendar.getDay())

    const days: CalendarDay[] = []
    const today = new Date()

    for (let i = 0; i < 42; i++) {
      const date = new Date(firstDayOfCalendar)
      date.setDate(firstDayOfCalendar.getDate() + i)

      const dateString = date.toISOString().split('T')[0]
      const dayMoods = moodData.filter(mood => {
        if (!mood || !mood.timestamp) return false
        // V2 timestamp is already a parsed Date object from MoodLogEntryRow
        return mood.timestamp.toISOString().split('T')[0] === dateString
      })

      // Map V2 single mood/intensity to color data for blending
      const colorData = dayMoods
        .filter(m => m?.color && typeof m.intensity === 'number')
        .map(m => ({ color: m.color, confidence: m.intensity / 10 }))

      const blendedColor = colorData.length > 0
        ? getBlendedColorWeighted(colorData)
        : undefined

      days.push({
        date,
        moods: dayMoods,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        blendedColor,
      })
    }
    return days
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const calendarDays = generateCalendarDays()

  return {
    currentDate,
    moodData,
    loading,
    selectedDay,
    setSelectedDay,
    navigateMonth,
    formatMonthYear,
    calendarDays,
  }
}