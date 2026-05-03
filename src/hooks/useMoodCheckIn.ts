import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { moodService } from '../services/mood'
import { getBlendedColorWithAlpha } from '../utils/moodColors'
import type { DetectedEmotion, ManualEmotion } from '../types/mood.types'
import type { SleepQuality, ContextCategoryKey } from '../services/mood/types'

export type CategoryConfig = {
  key: ContextCategoryKey
  title: string
  helper: string
  tags: string[]
}

export const CONTEXT_CATEGORIES: CategoryConfig[] = [
  { key: 'school', title: 'School', helper: 'Academic activities and pressure.', tags: ['classes', 'study', 'quiz', 'exam', 'homework', 'deadline', 'group-project', 'presentation'] },
  { key: 'health', title: 'Health', helper: 'Physical condition and body signals.', tags: ['headache', 'pain', 'sick', 'medication', 'exercise', 'nap', 'period', 'low-appetite', 'binge-eating'] },
  { key: 'social', title: 'Social', helper: 'Relationships and interactions.', tags: ['friends', 'family', 'partner', 'conflict', 'alone', 'social-media'] },
  { key: 'fun', title: 'Fun / Leisure', helper: 'Recreation and enjoyment.', tags: ['gaming', 'movie-series', 'music', 'travel', 'shopping', 'restaurant', 'hobby', 'outdoor'] },
  { key: 'productivity', title: 'Productivity', helper: 'Workload and life tasks.', tags: ['work', 'chores', 'finance', 'commute', 'screen-overload'] },
]

function getDayKey(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useMoodCheckIn({ onMoodLogged, onBackgroundChange }: { onMoodLogged?: () => void, onBackgroundChange?: (bg?: string) => void }) {
  const { user } = useAuth()
  
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4 

  const [selectedEmotions, setSelectedEmotions] = useState<DetectedEmotion[]>([])
  const [moodInputMode, setMoodInputMode] = useState<'manual' | 'selfie'>('manual')
  const [intensity, setIntensity] = useState(6) 
  
  const [energyLevel, setEnergyLevel] = useState(3) 
  const [stressLevel, setStressLevel] = useState(3) 
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>(null)
  const [sleepCapturedToday, setSleepCapturedToday] = useState(false)

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [journalEdited, setJournalEdited] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Check if sleep was already captured today
  useEffect(() => {
    const checkDailySleep = async () => {
      if (user?.id) {
        const hasEntry = await moodService.hasMoodEntryForDayKey(user.id, getDayKey(new Date()))
        setSleepCapturedToday(hasEntry)
      }
    }
    checkDailySleep()
  }, [user?.id])

  useEffect(() => {
    if (onBackgroundChange) {
      const background = selectedEmotions.length > 0
        ? `linear-gradient(135deg, ${getBlendedColorWithAlpha(selectedEmotions, 0.15)}, ${getBlendedColorWithAlpha(selectedEmotions, 0.05)})`
        : undefined
      onBackgroundChange(background)
    }
  }, [selectedEmotions, onBackgroundChange])

  useEffect(() => {
    if (selectedTags.length === 0) {
      if (!journalEdited) setNotes('')
      return
    }
    if (!journalEdited) {
      const emotionName = selectedEmotions[0]?.emotion || 'neutral'
      let draft = `Today I felt ${emotionName}, with energy level ${energyLevel}/5 and stress level ${stressLevel}/5.`
      
      const tagContexts = selectedTags.slice(0, 3).join(', ')
      if (tagContexts) draft += ` My day was mainly influenced by: ${tagContexts}.`
      
      setNotes(draft)
    }
  }, [selectedTags, energyLevel, stressLevel, selectedEmotions, journalEdited])

  const handleAIEmotionDetected = (emotions: DetectedEmotion[]) => {
    setSelectedEmotions(emotions)
    setMoodInputMode('selfie')
  }

  const handleManualEmotionToggle = (emotion: ManualEmotion) => {
    const newEmotion: DetectedEmotion = {
      emotion: emotion.name,
      confidence: intensity / 10,
      color: emotion.color,
    }
    setSelectedEmotions([newEmotion])
  }
  
  useEffect(() => {
    if (selectedEmotions.length > 0 && moodInputMode === 'manual') {
      setSelectedEmotions(prev => prev.map(e => ({ ...e, confidence: intensity / 10 })))
    }
  }, [intensity, moodInputMode])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(c => c + 1)
  }
  
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(c => c - 1)
  }

  const handleSubmit = async () => {
    if (selectedEmotions.length === 0) {
      alert('Please select a mood first.')
      return
    }
    if (!sleepCapturedToday && !sleepQuality) {
      alert('Please select your sleep quality for today.')
      return
    }
    if (!user?.id) {
      alert('Please log in to save your mood')
      return
    }

    try {
      setIsSubmitting(true)
      const primaryEmotion = selectedEmotions[0]
      const now = new Date()

      await moodService.createMoodLog(user.id, {
        mood: primaryEmotion.emotion,
        intensity: intensity,
        stress: stressLevel,
        energy: energyLevel,
        sleepQuality: sleepQuality || 'fair', // fallback if already captured
        color: primaryEmotion.color,
        dayKey: getDayKey(now),
        eventCategories: CONTEXT_CATEGORIES.filter(c => c.tags.some(t => selectedTags.includes(t))).map(c => c.key),
        eventTags: selectedTags,
        notes,
        journalSource: journalEdited ? 'manual' : 'auto',
        timestamp: now,
      })
      
      setSleepCapturedToday(true)
      if (onMoodLogged) onMoodLogged()
      setCurrentStep(4) 
    } catch (error) {
      alert(`Failed to log mood.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    currentStep,
    totalSteps,
    handleNext,
    handleBack,
    selectedEmotions,
    moodInputMode,
    setMoodInputMode,
    intensity,
    setIntensity,
    energyLevel,
    setEnergyLevel,
    stressLevel,
    setStressLevel,
    sleepQuality,
    setSleepQuality,
    sleepCapturedToday,
    selectedTags,
    toggleTag,
    notes,
    setNotes,
    setJournalEdited,
    isSubmitting,
    handleAIEmotionDetected,
    handleManualEmotionToggle,
    handleSubmit,
  }
}