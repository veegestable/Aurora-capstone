import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { moodService } from '../services/mood.service'
import { getBlendedColorWithAlpha } from '../utils/moodColors'
import type { DetectedEmotion, ManualEmotion } from '../types/mood.types'

interface UseMoodCheckInOptions {
  onMoodLogged?: () => void
  onBackgroundChange?: (background: string | undefined) => void
}

export function useMoodCheckIn({ onMoodLogged, onBackgroundChange }: UseMoodCheckInOptions) {
  const { user } = useAuth()
  const [selectedEmotions, setSelectedEmotions] = useState<DetectedEmotion[]>([])
  const [notes, setNotes] = useState('')
  const [isManualMode, setIsManualMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [energyLevel, setEnergyLevel] = useState(5)
  const [stressLevel, setStressLevel] = useState(3)
  const [existingLogId, setExistingLogId] = useState<string | null>(null)

  // Check for existing mood log for today
  useEffect(() => {
    const checkExistingLog = async () => {
      if (user) {
        try {
          const log = await moodService.getTodayMoodLog(user.id)
          if (log) {
            console.log('Found existing mood log:', log)
            setExistingLogId(log.id)
            setSelectedEmotions(log.emotions)
            setNotes(log.notes)
            setEnergyLevel(log.energy_level)
            setStressLevel(log.stress_level)
            setIsManualMode(log.detection_method === 'manual')
          }
        } catch (error) {
          console.error('Error checking existing mood log:', error)
        }
      }
    }
    checkExistingLog()
  }, [user])

  // Update background when emotions change
  useEffect(() => {
    if (onBackgroundChange) {
      const background = selectedEmotions.length > 0
        ? `linear-gradient(135deg, ${getBlendedColorWithAlpha(selectedEmotions, 0.15)}, ${getBlendedColorWithAlpha(selectedEmotions, 0.05)})`
        : undefined
      onBackgroundChange(background)
    }
  }, [selectedEmotions, onBackgroundChange])

  const handleAIEmotionDetected = (emotions: DetectedEmotion[]) => {
    setSelectedEmotions(emotions)
    setIsManualMode(false)
  }

  const handleManualEmotionToggle = (emotion: ManualEmotion) => {
    const existing = selectedEmotions.find(e => e.emotion === emotion.name)
    if (existing) {
      setSelectedEmotions(prev => prev.filter(e => e.emotion !== emotion.name))
    } else {
      const newEmotion: DetectedEmotion = {
        emotion: emotion.name,
        confidence: 0.7,
        color: emotion.color,
      }
      setSelectedEmotions(prev => [...prev, newEmotion])
    }
  }

  const handleSubmit = async () => {
    console.log('=== MOOD SUBMIT DEBUG ===')
    console.log('Selected emotions:', selectedEmotions)
    console.log('Current user:', user)
    console.log('User ID:', user?.id)
    console.log('Auth token in localStorage:', localStorage.getItem('token'))

    if (selectedEmotions.length === 0) {
      alert('Please select at least one emotion or use AI detection')
      return
    }
    if (!user) {
      alert('Please log in to save your mood')
      return
    }

    try {
      setIsSubmitting(true)
      const moodData = {
        emotions: selectedEmotions,
        notes,
        log_date: new Date(),
        energy_level: energyLevel,
        stress_level: stressLevel,
        detection_method: isManualMode ? 'manual' : 'ai',
      }

      if (existingLogId) {
        await moodService.updateMoodLog(existingLogId, moodData)
        alert('🎉 Mood updated successfully!')
      } else {
        const newLog = await moodService.createMoodLog(moodData)
        setExistingLogId(newLog.id)
        alert('🎉 Mood logged successfully!')
      }

      if (onMoodLogged) {
        onMoodLogged()
      }
    } catch (error) {
      console.error('=== MOOD SUBMIT ERROR ===')
      console.error('Error object:', error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to log mood: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    selectedEmotions,
    setSelectedEmotions,
    notes,
    setNotes,
    isManualMode,
    setIsManualMode,
    isSubmitting,
    energyLevel,
    setEnergyLevel,
    stressLevel,
    setStressLevel,
    existingLogId,
    handleAIEmotionDetected,
    handleManualEmotionToggle,
    handleSubmit,
  }
}