import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUserDaySettings } from '../contexts/UserDaySettingsContext'
import { moodService } from '../services/mood'
import { firebaseStorageService } from '../services/firebase-storage'
import { getBlendedColorWithAlpha } from '../utils/moodColors'
import type { DetectedEmotion, ManualEmotion } from '../types/mood.types'
import type {
  SleepQuality,
  MealResponse,
  DetectionMethod,
} from '../services/mood/types'
import { MANUAL_EMOTIONS } from '../utils/emotions'
import { DEFAULT_MEAL_SCHEDULE } from '../constants/mood/mealSchedule'
import {
  buildJournalDraft,
  getOverallPressureLabel,
  SCHOOL_TAGS,
  CONTEXT_CATEGORIES,
  categoriesFromTags,
  type CategoryConfig
} from '../constants/mood/journalTemplates'
export type { CategoryConfig }
export { CONTEXT_CATEGORIES }

function getDayKey(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface UseMoodCheckInArgs {
  onMoodLogged?: () => void
  onBackgroundChange?: (bg?: string) => void
}

export function useMoodCheckIn({ onMoodLogged, onBackgroundChange }: UseMoodCheckInArgs) {
  const { user } = useAuth()
  const { settings } = useUserDaySettings()

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  const [selectedEmotions, setSelectedEmotions] = useState<DetectedEmotion[]>([])
  const [moodInputMode, setMoodInputMode] = useState<'manual' | 'selfie'>('manual')
  const [detectionMethod, setDetectionMethod] = useState<DetectionMethod>('manual')
  const [intensity, setIntensity] = useState(6)
  const [durationMinutes, setDurationMinutes] = useState(60)

  const [energyLevel, setEnergyLevel] = useState(3)
  const [stressLevel, setStressLevel] = useState(3)
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>(null)
  const [sleepCapturedToday, setSleepCapturedToday] = useState(false)

  const mealSchedule = useMemo(
    () => settings?.mealSchedule && settings.mealSchedule.length > 0
      ? settings.mealSchedule
      : DEFAULT_MEAL_SCHEDULE,
    [settings?.mealSchedule],
  )
  const [mealResponses, setMealResponses] = useState<Record<string, boolean>>({})
  /** Meals already logged as Taken today — locked for the day (like bath). "Not yet" can be updated later. */
  const [mealsTakenLockedToday, setMealsTakenLockedToday] = useState<Set<string>>(new Set())

  const [bathTaken, setBathTaken] = useState<boolean | null>(null)
  const [bathLockedToday, setBathLockedToday] = useState(false)

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [journalEdited, setJournalEdited] = useState(false)
  const [journalImage, setJournalImage] = useState<File | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Hydrate "already-captured-today" flags so we can disable the right chips.
  useEffect(() => {
    if (!user?.id) return
    const dayKey = getDayKey(new Date())

    moodService.hasMoodEntryForDayKey(user.id, dayKey)
      .then(setSleepCapturedToday)
      .catch(() => setSleepCapturedToday(false))

    moodService.hasBathEntryForDayKey(user.id, dayKey)
      .then((locked) => {
        setBathLockedToday(locked)
        if (locked) setBathTaken(true)
      })
      .catch(() => setBathLockedToday(false))

    moodService
      .getMealsTakenLockedForDayKey(user.id, dayKey)
      .then(setMealsTakenLockedToday)
      .catch(() => setMealsTakenLockedToday(new Set()))
  }, [user?.id])

  // Drive the optional ambient background tint based on the current emotion blend.
  useEffect(() => {
    if (!onBackgroundChange) return
    const background = selectedEmotions.length > 0
      ? `linear-gradient(135deg, ${getBlendedColorWithAlpha(selectedEmotions, 0.15)}, ${getBlendedColorWithAlpha(selectedEmotions, 0.05)})`
      : undefined
    onBackgroundChange(background)
  }, [selectedEmotions, onBackgroundChange])

  // Auto-fill the journal draft from the current emotion + tags. Stops touching
  // the textarea once the user types into it (`journalEdited`).
  useEffect(() => {
    if (journalEdited) return
    if (selectedEmotions.length === 0 && selectedTags.length === 0) {
      setNotes('')
      return
    }
    const emotion = MANUAL_EMOTIONS.find((e) => e.name === selectedEmotions[0]?.emotion)
    const emotionLabel = emotion?.label?.toLowerCase() ?? selectedEmotions[0]?.emotion ?? 'neutral'
    setNotes(buildJournalDraft({ emotionLabel, energyLevel, stressLevel, selectedTags }))
  }, [selectedEmotions, selectedTags, energyLevel, stressLevel, journalEdited])

  const handleAIEmotionDetected = (emotions: DetectedEmotion[]) => {
    setSelectedEmotions(emotions)
    setMoodInputMode('selfie')
    setDetectionMethod('selfie_ai')
  }

  const clearDetectedEmotions = () => {
    setSelectedEmotions([])
    setDetectionMethod('manual')
  }

  const handleManualEmotionToggle = (emotion: ManualEmotion) => {
    setDetectionMethod('manual')
    const newEmotion: DetectedEmotion = {
      emotion: emotion.name,
      confidence: intensity / 10,
      color: emotion.color,
    }
    setSelectedEmotions([newEmotion])
  }

  // Keep stored confidence in sync with the intensity slider for manual entries.
  useEffect(() => {
    if (selectedEmotions.length === 0 || moodInputMode !== 'manual') return
    setSelectedEmotions((prev) => prev.map((e) => ({ ...e, confidence: intensity / 10 })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity, moodInputMode])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  const setMealResponse = (mealId: string, taken: boolean) => {
    if (mealsTakenLockedToday.has(mealId)) return
    setMealResponses((prev) => ({ ...prev, [mealId]: taken }))
  }

  // Pressure pill driven by total context selections this check-in.
  const pressureLabel = useMemo(() => getOverallPressureLabel(selectedTags.length), [selectedTags])
  const schoolTagCount = useMemo(
    () => selectedTags.filter((t) => (SCHOOL_TAGS as readonly string[]).includes(t)).length,
    [selectedTags],
  )

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep((c) => c + 1)
  }
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((c) => c - 1)
  }
  const goToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps) setCurrentStep(step)
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
      const dayKey = getDayKey(now)

      let journalImageUrl: string | undefined
      if (journalImage) {
        const ext = journalImage.type.split('/')[1] || 'jpg'
        const path = `journal_selfies/${user.id}/${dayKey}-${now.getTime()}.${ext}`
        journalImageUrl = await firebaseStorageService.uploadImage(path, journalImage)
      }

      // Only persist meals answered in this check-in; skip meals already Taken-locked today.
      const mealResponseList: MealResponse[] = mealSchedule
        .filter(
          (m) =>
            mealResponses[m.id] !== undefined && !mealsTakenLockedToday.has(m.id)
        )
        .map((m) => ({
          mealId: m.id,
          mealLabel: m.label,
          mealTime: m.time,
          taken: !!mealResponses[m.id],
        }))

      await moodService.createMoodLog(user.id, {
        mood: primaryEmotion.emotion,
        intensity,
        durationMinutes,
        stress: stressLevel,
        energy: energyLevel,
        sleepQuality: sleepQuality || 'fair',
        color: primaryEmotion.color,
        dayKey,
        eventCategories: categoriesFromTags(selectedTags),
        eventTags: selectedTags,
        notes,
        journalSource: journalEdited ? 'manual' : 'auto',
        detectionMethod,
        bathTaken: bathTaken ?? false,
        mealResponses: mealResponseList,
        journalImageUrl,
        timestamp: now,
      })

      setSleepCapturedToday(true)
      if (bathTaken) setBathLockedToday(true)
      setMealsTakenLockedToday((prev) => {
        const next = new Set(prev)
        mealResponseList.forEach((m) => {
          if (m.taken) next.add(m.mealId)
        })
        return next
      })

      onMoodLogged?.()
      setCurrentStep(4)
    } catch (error) {
      console.error('Failed to log mood:', error)
      alert('Failed to log mood.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    currentStep,
    totalSteps,
    handleNext,
    handleBack,
    goToStep,

    selectedEmotions,
    moodInputMode,
    setMoodInputMode,
    detectionMethod,
    handleAIEmotionDetected,
    clearDetectedEmotions,
    handleManualEmotionToggle,

    intensity,
    setIntensity,
    durationMinutes,
    setDurationMinutes,

    energyLevel,
    setEnergyLevel,
    stressLevel,
    setStressLevel,
    sleepQuality,
    setSleepQuality,
    sleepCapturedToday,

    mealSchedule,
    mealResponses,
    setMealResponse,
    mealsTakenLockedToday,

    bathTaken,
    setBathTaken,
    bathLockedToday,

    selectedTags,
    toggleTag,
    pressureLabel,
    schoolTagCount,

    notes,
    setNotes,
    journalEdited,
    setJournalEdited,
    journalImage,
    setJournalImage,

    isSubmitting,
    handleSubmit,
  }
}