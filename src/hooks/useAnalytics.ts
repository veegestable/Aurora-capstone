import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { moodService } from '../services/mood.service'
import { scheduleService } from '../services/schedule.service'
import { getEmotionColor } from '../utils/moodColors'

interface MoodLog {
  log_date: string
  full_date: Date
  emotions: string[]
}

interface Schedule {
  event_date: string
  event_type: string
}

export interface MoodStats {
  totalCheckIns: number
  topEmotions: { emotion: string; count: number; color: string }[]
  weeklyTrend: { week: string; averageIntensity: number }[]
  eventCorrelation: { eventType: string; emotions: string[] }[]
  uniqueEmotions: number
  currentStreak: number
  bestStreak: number
  timeDistribution: {
    morning: number
    afternoon: number
    evening: number
  }
}

interface RawMoodLog {
  log_date?: unknown
  date?: string
  emotions?: unknown[]
  id?: string
}

interface RawSchedule {
  event_date?: string
  event_type?: string
  id?: string
}

export function useAnalytics() {
  const { user } = useAuth()
  const [stats, setStats] = useState<MoodStats | null>(null)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month')

  useEffect(() => {
    if (user) {
      loadAnalytics()
    }
  }, [user, timeRange])

  const loadAnalytics = async () => {
    if (!user) return

    const endDate = new Date()
    const startDate = new Date()

    if (timeRange === 'week') {
      startDate.setDate(endDate.getDate() - 7)
    } else if (timeRange === 'month') {
      startDate.setDate(endDate.getDate() - 30)
    } else {
      startDate.setFullYear(endDate.getFullYear() - 1)
    }

    const [moodLogsRaw, schedulesRaw] = await Promise.all([
      moodService.getMoodLogs(user.id),
      scheduleService.getSchedules(
        user.id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ),
    ])

    const moodLogs: MoodLog[] = Array.isArray(moodLogsRaw)
      ? moodLogsRaw
        .filter((log) => {
          const moodLog = log as unknown as RawMoodLog
          return log !== null &&
            typeof log === 'object' &&
            (moodLog.log_date || moodLog.date)
        })
        .map((log: unknown) => {
          const rawLog = log as Record<string, unknown>
          let dateObj = new Date()
          const logDate = rawLog.log_date as Record<string, unknown> | Date | string | undefined
          if (logDate && typeof (logDate as Record<string, unknown>).toDate === 'function') {
            dateObj = (logDate as { toDate: () => Date }).toDate()
          } else if (logDate instanceof Date) {
            dateObj = logDate
          } else if (typeof logDate === 'string') {
            dateObj = new Date(logDate)
          }

          return {
            log_date: dateObj.toISOString().split('T')[0],
            full_date: dateObj,
            emotions: Array.isArray(rawLog.emotions)
              ? (rawLog.emotions as unknown[]).filter((e: unknown): e is string => typeof e === 'string')
              : [],
          }
        })
      : []

    const schedulesArr: Schedule[] = Array.isArray(schedulesRaw)
      ? schedulesRaw
        .filter((sch) => {
          return sch !== null &&
            typeof sch === 'object' &&
            typeof (sch as RawSchedule).event_date === 'string' &&
            typeof (sch as RawSchedule).event_type === 'string'
        })
        .map(sch => ({
          event_date: (sch as RawSchedule).event_date!,
          event_type: (sch as RawSchedule).event_type!,
        }))
      : []

    // 1. Unique emotions
    const allEmotions = new Set<string>()
    const emotionCounts: Record<string, number> = {}
    moodLogs.forEach(log => {
      log.emotions.forEach(emotion => {
        allEmotions.add(emotion)
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
      })
    })

    const topEmotions = Object.entries(emotionCounts)
      .map(([emotion, count]) => ({
        emotion,
        count,
        color: getEmotionColor(emotion),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 2. Weekly grouping
    const weeklyData: Record<string, number[]> = {}
    moodLogs.forEach(log => {
      const date = new Date(log.log_date)
      const day = date.getDay() === 0 ? 6 : date.getDay() - 1
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - day)
      const weekKey = weekStart.toISOString().split('T')[0]
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = []
      }
      weeklyData[weekKey].push(log.emotions.length)
    })

    const weeklyTrend = Object.entries(weeklyData).map(([week, intensities]) => ({
      week,
      averageIntensity: intensities.reduce((a, b) => a + b, 0) / intensities.length,
    }))

    // 3. Event Correlation
    const eventTypeEmotions: Record<string, string[]> = {}
    schedulesArr.forEach(schedule => {
      const eventDate = schedule.event_date.split('T')[0]
      const nearbyMoods = moodLogs.filter(log => {
        const logDate = new Date(log.log_date)
        const schedDate = new Date(eventDate)
        const diffDays = Math.abs((schedDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays <= 2
      })
      if (nearbyMoods.length > 0) {
        if (!eventTypeEmotions[schedule.event_type]) {
          eventTypeEmotions[schedule.event_type] = []
        }
        nearbyMoods.forEach(mood => {
          eventTypeEmotions[schedule.event_type].push(...mood.emotions)
        })
      }
    })

    const eventCorrelation = Object.entries(eventTypeEmotions).map(([eventType, emotions]) => {
      const counts: Record<string, number> = {}
      emotions.forEach(e => {
        counts[e] = (counts[e] || 0) + 1
      })
      const top = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([e]) => e)
      return { eventType, emotions: top }
    })

    // 4. Streak Calculation
    const sortedLogs = [...moodLogs].sort((a, b) =>
      new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    )
    const uniqueDates = Array.from(new Set(sortedLogs.map(log => log.log_date)))

    let currentStreak = 0
    let bestStreak = 0

    if (uniqueDates.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const lastLogDate = uniqueDates[0]
      if (lastLogDate === today || lastLogDate === yesterdayStr) {
        currentStreak = 1
        for (let i = 0; i < uniqueDates.length - 1; i++) {
          const curr = new Date(uniqueDates[i])
          const prev = new Date(uniqueDates[i + 1])
          const diffDays = Math.ceil(Math.abs(curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays === 1) {
            currentStreak++
          } else {
            break
          }
        }
      }

      let tempStreak = 1
      for (let i = 0; i < uniqueDates.length - 1; i++) {
        const curr = new Date(uniqueDates[i])
        const prev = new Date(uniqueDates[i + 1])
        const diffDays = Math.ceil(Math.abs(curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          tempStreak++
        } else {
          bestStreak = Math.max(bestStreak, tempStreak)
          tempStreak = 1
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak)
    }

    // 5. Time Distribution
    let morningCount = 0
    let afternoonCount = 0
    let eveningCount = 0
    const totalLogs = moodLogs.length

    moodLogs.forEach(log => {
      const hour = log.full_date.getHours()
      if (hour >= 4 && hour < 12) {
        morningCount++
      } else if (hour >= 12 && hour < 18) {
        afternoonCount++
      } else {
        eveningCount++
      }
    })

    const timeDistribution = {
      morning: totalLogs > 0 ? Math.round((morningCount / totalLogs) * 100) : 0,
      afternoon: totalLogs > 0 ? Math.round((afternoonCount / totalLogs) * 100) : 0,
      evening: totalLogs > 0 ? Math.round((eveningCount / totalLogs) * 100) : 0,
    }

    setStats({
      totalCheckIns: moodLogs.length,
      topEmotions,
      weeklyTrend,
      eventCorrelation,
      uniqueEmotions: allEmotions.size,
      currentStreak,
      bestStreak,
      timeDistribution,
    })
  }

  return { stats, timeRange, setTimeRange }
}