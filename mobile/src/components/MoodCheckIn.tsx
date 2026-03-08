import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Image, PanResponder } from 'react-native';
import { EmotionDetection } from './EmotionDetection';
import { moodService } from '../services/mood.service';
import { useAuth } from '../stores/AuthContext';
import { Sparkles, Zap, ClipboardList, ArrowLeft, ArrowRight, Check, Camera, Hand, Moon, Heart, PenLine } from 'lucide-react-native';
import { AURORA } from '../constants/aurora-colors';

interface MoodCheckInProps {
    onComplete?: () => void;
}


interface DetectedEmotion {
    emotion: string;
    confidence: number;
    color: string;
}

const SimpleSlider = ({ value, onValueChange, minimumTrackTintColor, thumbTintColor, onSlidingStart, onSlidingComplete }: any) => {
    const widthRef = useRef(0);
    const startValue = useRef(0);

    // Refs for callbacks to ensure PanResponder always uses the latest functions
    const onValueChangeRef = useRef(onValueChange);
    const onSlidingStartRef = useRef(onSlidingStart);
    const onSlidingCompleteRef = useRef(onSlidingComplete);

    // Keep refs updated
    onValueChangeRef.current = onValueChange;
    onSlidingStartRef.current = onSlidingStart;
    onSlidingCompleteRef.current = onSlidingComplete;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: (evt) => {
                if (onSlidingStartRef.current) onSlidingStartRef.current();
                const tapX = evt.nativeEvent.locationX;
                const width = widthRef.current;
                if (width > 0) {
                    const val = Math.max(0, Math.min(1, tapX / width));
                    startValue.current = val;
                    if (onValueChangeRef.current) onValueChangeRef.current(val);
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                const { dx } = gestureState;
                const width = widthRef.current;
                if (width > 0) {
                    const newVal = Math.max(0, Math.min(1, startValue.current + (dx / width)));
                    if (onValueChangeRef.current) onValueChangeRef.current(newVal);
                }
            },
            onPanResponderRelease: () => {
                if (onSlidingCompleteRef.current) onSlidingCompleteRef.current();
            },
            onPanResponderTerminate: () => {
                if (onSlidingCompleteRef.current) onSlidingCompleteRef.current();
            },
        })
    ).current;

    return (
        <View
            style={{ height: 40, width: '100%', justifyContent: 'center' }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onLayout={(e) => {
                widthRef.current = e.nativeEvent.layout.width;
            }}
            {...panResponder.panHandlers}
        >
            <View pointerEvents="none" style={{ height: 4, backgroundColor: AURORA.cardAlt, borderRadius: 2 }}>
                <View style={{
                    width: `${value * 100}%`,
                    height: '100%',
                    backgroundColor: minimumTrackTintColor,
                    borderRadius: 2
                }} />
            </View>
            <View pointerEvents="none" style={{
                position: 'absolute',
                left: `${value * 100}%`,
                marginLeft: -10,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: thumbTintColor,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
                borderWidth: 2,
                borderColor: AURORA.bg
            }} />
        </View>
    );
};

const EMOTION_COLOR_MAP: Record<string, string> = {
    joy: AURORA.moodHappy,
    happiness: AURORA.moodHappy,
    happy: AURORA.moodHappy,
    surprise: AURORA.moodSurprise,
    surprised: AURORA.moodSurprise,
    anger: AURORA.moodAngry,
    angry: AURORA.moodAngry,
    sadness: AURORA.moodSad,
    sad: AURORA.moodSad,
    neutral: AURORA.moodNeutral,
    fear: '#9333EA',
    fearful: '#9333EA',
    disgust: '#059669',
    disgusted: '#059669',
};

const getEmotionColor = (emotionName: string): string => {
    const normalized = emotionName.toLowerCase().trim();
    return EMOTION_COLOR_MAP[normalized] || AURORA.moodNeutral;
};

const MANUAL_EMOTIONS = [
    { name: 'joy', color: AURORA.moodHappy, label: 'Happy', image: require('../assets/happy.png') },
    { name: 'sadness', color: AURORA.moodSad, label: 'Sad', image: require('../assets/sad.png') },
    { name: 'anger', color: AURORA.moodAngry, label: 'Angry', image: require('../assets/angry.png') },
    { name: 'surprise', color: AURORA.moodSurprise, label: 'Surprise', image: require('../assets/surprise.png') },
    { name: 'neutral', color: AURORA.moodNeutral, label: 'Neutral', image: require('../assets/neutral.png') }
];

type CheckInMode = 'manual' | 'camera';

export function MoodCheckIn({ onComplete }: MoodCheckInProps) {
    const { user } = useAuth();
    const [selectedEmotions, setSelectedEmotions] = useState<DetectedEmotion[]>([]);
    const [notes, setNotes] = useState('');
    const [isManualMode, setIsManualMode] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [energyLevel, setEnergyLevel] = useState(5);
    const [stressLevel, setStressLevel] = useState(3);
    const [existingLogId, setExistingLogId] = useState<string | null>(null);
    const [classesCount, setClassesCount] = useState(0);
    const [examsCount, setExamsCount] = useState(0);
    const [deadlinesCount, setDeadlinesCount] = useState(0);
    const [sleepQuality, setSleepQuality] = useState<number>(2); // 1: poor, 2: fair, 3: good
    const [currentStep, setCurrentStep] = useState(1);
    const [isScrollEnabled, setIsScrollEnabled] = useState(true);
    const totalSteps = 3;
    const selectedEmotion = selectedEmotions[0];

    const loadDailyMood = async () => {
        if (user) {
            try {
                const log = await moodService.getTodayMoodLog(user.id);
                if (log) {
                    setExistingLogId(log.id);
                    setSelectedEmotions(log.emotions);
                    setNotes(log.notes);
                    setEnergyLevel(log.energy_level);
                    setStressLevel(log.stress_level);
                    setIsManualMode(log.detection_method === 'manual');
                    if (log.classes_count !== undefined) setClassesCount(log.classes_count);
                    if (log.exams_count !== undefined) setExamsCount(log.exams_count);
                    if (log.deadlines_count !== undefined) setDeadlinesCount(log.deadlines_count);
                    if (log.sleep_quality !== undefined) {
                        // Handle both number and legacy string types
                        const val = log.sleep_quality as any;
                        if (typeof val === 'number') {
                            setSleepQuality(val);
                        } else if (val === 'poor') {
                            setSleepQuality(1);
                        } else if (val === 'fair') {
                            setSleepQuality(2);
                        } else if (val === 'good') {
                            setSleepQuality(3);
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking existing mood log:', error);
            }
        }
    };

    useEffect(() => {
        loadDailyMood();
    }, [user]);

    const handleNext = () => {
        if (currentStep === 1 && selectedEmotions.length === 0) {
            Alert.alert('Please select a mood', 'How are you feeling right now?');
            return;
        }
        if (currentStep < totalSteps) setCurrentStep(c => c + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    const handleAIEmotionDetected = (emotions: DetectedEmotion[]) => {
        // Ensure each emotion has the correct color from our mapping
        const emotionsWithColors = emotions.map(e => ({
            ...e,
            color: getEmotionColor(e.emotion)
        }));
        setSelectedEmotions(emotionsWithColors);
        setIsManualMode(false);
    };

    const handleModeSwitch = (manual: boolean) => {
        // Clear selected emotions when switching modes to prevent stacking
        if (manual !== isManualMode) {
            setSelectedEmotions([]);
        }
        setIsManualMode(manual);
    };

    const handleManualEmotionToggle = (emotion: typeof MANUAL_EMOTIONS[0]) => {
        // Normalize emotion name for comparison (handle variants like "angry" vs "anger")
        const normalizeEmotionName = (name: string) => {
            const variants: Record<string, string> = {
                anger: 'angry',
                angry: 'angry',
                sadness: 'sad',
                sad: 'sad',
                joy: 'happy',
                happiness: 'happy',
                happy: 'happy',
                surprise: 'surprise',
                surprised: 'surprise',
                neutral: 'neutral',
            };
            return variants[name.toLowerCase()] || name.toLowerCase();
        };

        const normalizedNew = normalizeEmotionName(emotion.name);
        const existing = selectedEmotions.find(e => normalizeEmotionName(e.emotion) === normalizedNew);
        
        if (existing) {
            // Remove the emotion (toggle off)
            setSelectedEmotions(prev => prev.filter(e => normalizeEmotionName(e.emotion) !== normalizedNew));
        } else {
            // Add new emotion, but first remove any variant that might exist
            setSelectedEmotions(prev => [
                ...prev.filter(e => normalizeEmotionName(e.emotion) !== normalizedNew),
                {
                    emotion: emotion.name,
                    confidence: 0.7,
                    color: emotion.color
                }
            ]);
        }
    };

    const checkCounselorReferral = (stress: number, emotions: DetectedEmotion[]) => {
        const negativeEmotions = ['sadness', 'anger', 'fear'];
        const hasHighNegativeEmotion = emotions.some(e =>
            negativeEmotions.includes(e.emotion) && e.confidence > 0.6
        );

        if (stress >= 8 || hasHighNegativeEmotion) {
            Alert.alert(
                'Need Support?',
                'It looks like you might be going through a tough time. Would you like to connect with a counselor?',
                [
                    { text: 'No thanks', style: 'cancel' },
                    { text: 'Yes, please', onPress: () => {
                        onComplete?.();
                    }}
                ]
            );
        }
    };

    const getMoodMessage = () => {
        const primaryEmotion = selectedEmotions[0]?.emotion.toLowerCase();
        const negativeEmotions = ['sadness', 'anger', 'fear', 'disgust'];

        if (negativeEmotions.includes(primaryEmotion)) {
            return {
                title: "It's okay not to be okay.",
                message: "Remember to take deep breaths. Try a mindfulness exercise to help center yourself.",
                isPositive: false
            };
        }

        return {
            title: "Keep up the great vibes!",
            message: "You're doing amazing! Hold onto this feeling and carry it with you.",
            isPositive: true
        };
    };

    const handleSubmit = async () => {
        if (selectedEmotions.length === 0) {
            Alert.alert('Error', 'Please select at least one emotion');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'Please log in to save mood');
            return;
        }

        try {
            setIsSubmitting(true);

            checkCounselorReferral(stressLevel, selectedEmotions);

            const moodData = {
                emotions: selectedEmotions,
                notes,
                log_date: new Date(),
                energy_level: energyLevel,
                stress_level: stressLevel,
                classes_count: classesCount,
                exams_count: examsCount,
                deadlines_count: deadlinesCount,
                sleep_quality: sleepQuality,
                detection_method: isManualMode ? 'manual' : 'ai' as const
            };

            if (existingLogId) {
                await moodService.updateMoodLog(existingLogId, moodData);
            } else {
                const newLog = await moodService.createMoodLog(moodData);
                setExistingLogId(newLog.id);
            }

            // Instead of resetting, show the success view
            setIsSubmitting(false);
            setIsSubmitted(true);
            await loadDailyMood(); // Reload to ensure we have the latest state (e.g. ID)
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to check in');
            setIsSubmitting(false);
        }
    };

    const Counter = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: AURORA.border }}>
            <Text style={{ color: AURORA.textPrimary, fontWeight: '500', fontSize: 16, flex: 1 }}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                    onPress={() => onChange(Math.max(0, value - 1))}
                    style={{ width: 36, height: 36, backgroundColor: AURORA.cardAlt, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                    activeOpacity={0.7}
                >
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: AURORA.textSec }}>−</Text>
                </TouchableOpacity>
                <View style={{ width: 40, height: 40, backgroundColor: AURORA.cardDark, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: AURORA.textPrimary }}>{value}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => onChange(value + 1)}
                    style={{ width: 36, height: 36, backgroundColor: 'rgba(45, 107, 255, 0.15)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                    activeOpacity={0.7}
                >
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: AURORA.blue }}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const stepLabels = ['Mood', 'Context', 'Notes'];
    
    const StepIndicator = () => (
        <View style={{ marginBottom: 32, paddingHorizontal: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                {[1, 2, 3].map((step) => (
                    <React.Fragment key={step}>
                        <View style={{ alignItems: 'center' }}>
                            <View 
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 8,
                                    backgroundColor: currentStep > step ? AURORA.green : (currentStep === step ? AURORA.blue : AURORA.cardAlt)
                                }}
                            >
                                {currentStep > step ? (
                                    <Check size={20} color={AURORA.textPrimary} strokeWidth={3} />
                                ) : (
                                    <Text style={{ fontWeight: 'bold', color: currentStep === step ? AURORA.textPrimary : AURORA.textMuted }}>
                                        {step}
                                    </Text>
                                )}
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '500', color: currentStep >= step ? AURORA.blue : AURORA.textMuted }}>
                                {stepLabels[step - 1]}
                            </Text>
                        </View>
                        {step < 3 && (
                            <View style={{ flex: 1, height: 4, marginHorizontal: 12, borderRadius: 2, backgroundColor: currentStep > step ? AURORA.green : AURORA.cardAlt }} />
                        )}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );

    if (isSubmitted) {
        const moodMessage = getMoodMessage();
        return (
            <View 
                style={{ 
                    flex: 1, 
                    backgroundColor: AURORA.bg,
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: 24 
                }}
            >
                <View 
                    style={{
                        backgroundColor: AURORA.card,
                        padding: 32,
                        borderRadius: 24,
                        width: '100%',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: AURORA.border,
                    }}
                >
                    <View 
                        style={{
                            padding: 20,
                            borderRadius: 9999,
                            marginBottom: 24,
                            backgroundColor: moodMessage.isPositive ? 'rgba(254, 189, 3, 0.15)' : 'rgba(45, 107, 255, 0.15)'
                        }}
                    >
                        {moodMessage.isPositive ? (
                            <Sparkles size={48} color={AURORA.amber} />
                        ) : (
                            <Heart size={48} color={AURORA.blue} />
                        )}
                    </View>

                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: AURORA.textPrimary, textAlign: 'center', marginBottom: 12 }}>
                            {moodMessage.title}
                        </Text>
                        <Text style={{ color: AURORA.textSec, textAlign: 'center', fontSize: 16, lineHeight: 24, paddingHorizontal: 16 }}>
                            {moodMessage.message}
                        </Text>
                    </View>

                    <View 
                        style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            marginBottom: 32, 
                            backgroundColor: AURORA.cardAlt, 
                            paddingHorizontal: 16, 
                            paddingVertical: 12, 
                            borderRadius: 16,
                            gap: 12 
                        }}
                    >
                        <View 
                            style={{ 
                                width: 16, 
                                height: 16, 
                                borderRadius: 8,
                                backgroundColor: selectedEmotion?.color || AURORA.blue 
                            }} 
                        />
                        <Text style={{ fontWeight: '600', color: AURORA.textPrimary, textTransform: 'capitalize' }}>
                            Feeling {selectedEmotion?.emotion || 'great'}
                        </Text>
                        <Text style={{ color: AURORA.textMuted }}>•</Text>
                        <Text style={{ color: AURORA.textSec }}>
                            Energy {energyLevel}/10
                        </Text>
                    </View>

                    <View style={{ width: '100%', gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => onComplete?.()}
                            style={{
                                backgroundColor: AURORA.blue,
                                paddingVertical: 16,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: AURORA.textPrimary, fontWeight: '600', fontSize: 16 }}>Done</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setIsSubmitted(false)}
                            style={{
                                paddingVertical: 12,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: AURORA.textSec, fontWeight: '500' }}>Edit Log</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: AURORA.bg }}
            contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
            scrollEnabled={isScrollEnabled}
            showsVerticalScrollIndicator={false}
        >
            <View style={{ padding: 20, paddingTop: 24 }}>
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: AURORA.textPrimary, textAlign: 'center', marginBottom: 8 }}>
                        {currentStep === 1 && `Hey ${user?.full_name ? user.full_name.split(' ')[0] : 'there'}!`}
                        {currentStep === 2 && "What's on your mind?"}
                        {currentStep === 3 && "Final thoughts"}
                    </Text>
                    <Text style={{ color: AURORA.textSec, textAlign: 'center', fontSize: 16 }}>
                        {currentStep === 1 && "How are you feeling right now?"}
                        {currentStep === 2 && "Let's understand what's affecting you"}
                        {currentStep === 3 && "Add any notes before we wrap up"}
                    </Text>
                </View>

                <StepIndicator />

                {/* STEP 1: MOOD & INTENSITY */}
                {currentStep === 1 && (
                    <View style={{ gap: 24 }}>
                        {/* Mode Toggle */}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', backgroundColor: AURORA.cardAlt, borderRadius: 16, padding: 6, alignSelf: 'center' }}>
                            <TouchableOpacity
                                onPress={() => handleModeSwitch(false)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 20,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: !isManualMode ? AURORA.card : 'transparent',
                                }}
                                activeOpacity={0.7}
                            >
                                <Camera size={18} color={!isManualMode ? AURORA.blue : AURORA.textMuted} />
                                <Text style={{ marginLeft: 8, fontWeight: '600', color: !isManualMode ? AURORA.blue : AURORA.textMuted }}>
                                    AI Camera
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleModeSwitch(true)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 20,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: isManualMode ? AURORA.card : 'transparent',
                                }}
                                activeOpacity={0.7}
                            >
                                <Hand size={18} color={isManualMode ? AURORA.blue : AURORA.textMuted} />
                                <Text style={{ marginLeft: 8, fontWeight: '600', color: isManualMode ? AURORA.blue : AURORA.textMuted }}>
                                    Manual
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {!isManualMode ? (
                            <EmotionDetection onEmotionDetected={handleAIEmotionDetected} />
                        ) : (
                            <View style={{ backgroundColor: AURORA.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AURORA.border }}>
                                <Text style={{ fontWeight: '600', color: AURORA.textPrimary, marginBottom: 16, textAlign: 'center' }}>
                                    Select how you're feeling
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
                                    {MANUAL_EMOTIONS.map(emotion => {
                                        const isSelected = selectedEmotions.some(e => e.emotion === emotion.name);
                                        return (
                                            <TouchableOpacity
                                                key={emotion.name}
                                                onPress={() => handleManualEmotionToggle(emotion)}
                                                style={{
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 72,
                                                    height: 88,
                                                    borderRadius: 16,
                                                    backgroundColor: isSelected ? `${emotion.color}20` : AURORA.cardAlt,
                                                    borderWidth: isSelected ? 2 : 1,
                                                    borderColor: isSelected ? emotion.color : AURORA.border
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Image
                                                    source={emotion.image}
                                                    style={{ width: 40, height: 40 }}
                                                    resizeMode="contain"
                                                />
                                                <Text style={{ fontWeight: '500', fontSize: 12, marginTop: 6, color: isSelected ? emotion.color : AURORA.textSec }}>
                                                    {emotion.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {selectedEmotions.length > 0 && (
                            <View style={{ backgroundColor: AURORA.card, borderRadius: 16, padding: 20, marginTop: 8, borderWidth: 1, borderColor: AURORA.border }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${getEmotionColor(selectedEmotions[0]?.emotion || 'neutral')}20`, alignItems: 'center', justifyContent: 'center' }}>
                                        <Zap size={16} color={getEmotionColor(selectedEmotions[0]?.emotion || 'neutral')} />
                                    </View>
                                    <Text style={{ fontWeight: 'bold', color: AURORA.textPrimary }}>Intensity Level</Text>
                                </View>
                                {selectedEmotions.map((emotion, index) => {
                                    const emotionColor = getEmotionColor(emotion.emotion);
                                    return (
                                        <View key={index} style={{ marginBottom: 16 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: emotionColor }} />
                                                    <Text style={{ textTransform: 'capitalize', fontWeight: '600', color: emotionColor }}>
                                                        {emotion.emotion}
                                                    </Text>
                                                </View>
                                                <View style={{ backgroundColor: `${emotionColor}20`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 }}>
                                                    <Text style={{ fontWeight: 'bold', color: emotionColor }}>
                                                        {Math.round(emotion.confidence * 100)}%
                                                    </Text>
                                                </View>
                                            </View>
                                            <SimpleSlider
                                                value={emotion.confidence}
                                                onValueChange={(val: number) => {
                                                    const newEmotions = [...selectedEmotions];
                                                    newEmotions[index].confidence = val;
                                                    setSelectedEmotions(newEmotions);
                                                }}
                                                minimumTrackTintColor={emotionColor}
                                                thumbTintColor={emotionColor}
                                                onSlidingStart={() => setIsScrollEnabled(false)}
                                                onSlidingComplete={() => setIsScrollEnabled(true)}
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {/* STEP 2: CONTEXT (Academic, Sleep, Energy, Stress) */}
                {currentStep === 2 && (
                    <View style={{ gap: 16 }}>
                        {/* Selected Emotion Summary */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: AURORA.card, borderRadius: 16, borderWidth: 1, borderColor: AURORA.border, alignSelf: 'center' }}>
                            <Text style={{ color: AURORA.textSec, marginRight: 8 }}>Currently feeling</Text>
                            <View style={{ width: 12, height: 12, borderRadius: 6, marginRight: 8, backgroundColor: selectedEmotion?.color || AURORA.blue }} />
                            <Text style={{ fontWeight: 'bold', color: AURORA.textPrimary, textTransform: 'capitalize' }}>
                                {selectedEmotion?.emotion || 'Unknown'}
                            </Text>
                        </View>

                        {/* Academic Load Card */}
                        <View style={{ backgroundColor: AURORA.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: AURORA.border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(45, 107, 255, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                                    <ClipboardList size={20} color={AURORA.blue} />
                                </View>
                                <View>
                                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: AURORA.textPrimary }}>Academic Load</Text>
                                    <Text style={{ color: AURORA.textSec, fontSize: 14 }}>What's on your plate today?</Text>
                                </View>
                            </View>
                            <Counter label="Classes Today" value={classesCount} onChange={setClassesCount} />
                            <Counter label="Upcoming Exams" value={examsCount} onChange={setExamsCount} />
                            <Counter label="Deadlines" value={deadlinesCount} onChange={setDeadlinesCount} />
                        </View>

                        {/* Vitality Card */}
                        <View style={{ backgroundColor: AURORA.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: AURORA.border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(254, 189, 3, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Zap size={20} color={AURORA.amber} />
                                </View>
                                <View>
                                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: AURORA.textPrimary }}>Vitality</Text>
                                    <Text style={{ color: AURORA.textSec, fontSize: 14 }}>How's your body feeling?</Text>
                                </View>
                            </View>

                            {/* Sleep Quality */}
                            <View style={{ marginBottom: 24 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <Moon size={16} color={AURORA.purple} />
                                    <Text style={{ color: AURORA.textPrimary, fontWeight: '600' }}>Sleep Quality</Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {[
                                        { label: 'Poor', value: 1, emoji: '😴' },
                                        { label: 'Fair', value: 2, emoji: '😐' },
                                        { label: 'Good', value: 3, emoji: '😊' }
                                    ].map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            onPress={() => setSleepQuality(option.value)}
                                            style={{
                                                flex: 1,
                                                paddingVertical: 12,
                                                borderRadius: 12,
                                                alignItems: 'center',
                                                backgroundColor: sleepQuality === option.value ? 'rgba(124, 58, 237, 0.15)' : AURORA.cardAlt,
                                                borderWidth: sleepQuality === option.value ? 2 : 1,
                                                borderColor: sleepQuality === option.value ? AURORA.purple : AURORA.border
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={{ fontSize: 20, marginBottom: 4 }}>{option.emoji}</Text>
                                            <Text style={{ fontWeight: '600', fontSize: 14, color: sleepQuality === option.value ? AURORA.purpleBright : AURORA.textSec }}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Energy Level */}
                            <View style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <Text style={{ fontWeight: '600', color: AURORA.textPrimary }}>Energy Level</Text>
                                    <View style={{ backgroundColor: 'rgba(254, 189, 3, 0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 }}>
                                        <Text style={{ fontWeight: 'bold', color: AURORA.amber }}>{energyLevel}/10</Text>
                                    </View>
                                </View>
                                <SimpleSlider
                                    value={energyLevel / 10}
                                    onValueChange={(val: number) => setEnergyLevel(Math.max(1, Math.round(val * 10)))}
                                    minimumTrackTintColor={AURORA.amber}
                                    thumbTintColor={AURORA.amber}
                                    onSlidingStart={() => setIsScrollEnabled(false)}
                                    onSlidingComplete={() => setIsScrollEnabled(true)}
                                />
                            </View>

                            {/* Stress Level */}
                            <View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <Text style={{ fontWeight: '600', color: AURORA.textPrimary }}>Stress Level</Text>
                                    <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 }}>
                                        <Text style={{ fontWeight: 'bold', color: AURORA.red }}>{stressLevel}/10</Text>
                                    </View>
                                </View>
                                <SimpleSlider
                                    value={stressLevel / 10}
                                    onValueChange={(val: number) => setStressLevel(Math.max(1, Math.round(val * 10)))}
                                    minimumTrackTintColor={AURORA.red}
                                    thumbTintColor={AURORA.red}
                                    onSlidingStart={() => setIsScrollEnabled(false)}
                                    onSlidingComplete={() => setIsScrollEnabled(true)}
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                                    <Text style={{ fontSize: 12, color: AURORA.textMuted }}>Relaxed</Text>
                                    <Text style={{ fontSize: 12, color: AURORA.textMuted }}>Overwhelmed</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* STEP 3: JOURNAL & SUBMIT */}
                {currentStep === 3 && (
                    <View style={{ gap: 16 }}>
                        {/* Quick Summary */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: AURORA.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AURORA.border }}>
                            <View style={{ alignItems: 'center', flex: 1 }}>
                                <View style={{ width: 12, height: 12, borderRadius: 6, marginBottom: 4, backgroundColor: selectedEmotion?.color || AURORA.blue }} />
                                <Text style={{ fontSize: 12, color: AURORA.textMuted }}>Mood</Text>
                                <Text style={{ fontWeight: '600', color: AURORA.textPrimary, textTransform: 'capitalize', fontSize: 14 }}>
                                    {selectedEmotion?.emotion || '-'}
                                </Text>
                            </View>
                            <View style={{ width: 1, backgroundColor: AURORA.border }} />
                            <View style={{ alignItems: 'center', flex: 1 }}>
                                <Zap size={12} color={AURORA.amber} />
                                <Text style={{ fontSize: 12, color: AURORA.textMuted, marginTop: 4 }}>Energy</Text>
                                <Text style={{ fontWeight: '600', color: AURORA.textPrimary, fontSize: 14 }}>{energyLevel}/10</Text>
                            </View>
                            <View style={{ width: 1, backgroundColor: AURORA.border }} />
                            <View style={{ alignItems: 'center', flex: 1 }}>
                                <Heart size={12} color={AURORA.red} />
                                <Text style={{ fontSize: 12, color: AURORA.textMuted, marginTop: 4 }}>Stress</Text>
                                <Text style={{ fontWeight: '600', color: AURORA.textPrimary, fontSize: 14 }}>{stressLevel}/10</Text>
                            </View>
                        </View>

                        {/* Journal Card */}
                        <View style={{ backgroundColor: AURORA.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: AURORA.border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(124, 58, 237, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                                    <PenLine size={20} color={AURORA.purple} />
                                </View>
                                <View>
                                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: AURORA.textPrimary }}>Journal</Text>
                                    <Text style={{ color: AURORA.textSec, fontSize: 14 }}>Optional but helpful</Text>
                                </View>
                            </View>
                            <TextInput
                                style={{ backgroundColor: AURORA.cardAlt, borderWidth: 1, borderColor: AURORA.border, borderRadius: 12, padding: 16, color: AURORA.textPrimary, fontSize: 16, lineHeight: 24, minHeight: 140, textAlignVertical: 'top' }}
                                placeholder="What's on your mind? Write about triggers, thoughts, or anything you want to remember..."
                                placeholderTextColor={AURORA.textMuted}
                                multiline
                                value={notes}
                                onChangeText={setNotes}
                                numberOfLines={6}
                            />
                        </View>

                        {/* Encouragement Banner */}
                        <View style={{ backgroundColor: 'rgba(45, 107, 255, 0.1)', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: 'rgba(45, 107, 255, 0.2)' }}>
                            <View style={{ backgroundColor: 'rgba(45, 107, 255, 0.15)', padding: 12, borderRadius: 9999 }}>
                                <Sparkles size={22} color={AURORA.blue} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: AURORA.textPrimary, fontWeight: '600', marginBottom: 2 }}>You're doing great!</Text>
                                <Text style={{ color: AURORA.textSec, fontSize: 14, lineHeight: 20 }}>
                                    Self-awareness is the first step to positive change. Keep it up!
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* NAVIGATION BUTTONS - Fixed at bottom */}
            <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, backgroundColor: AURORA.bg }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {currentStep > 1 && (
                        <TouchableOpacity
                            onPress={handleBack}
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 16,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: AURORA.border,
                                backgroundColor: AURORA.card
                            }}
                        >
                            <ArrowLeft size={18} color={AURORA.textSec} />
                            <Text style={{ fontWeight: '600', color: AURORA.textSec, marginLeft: 8 }}>Back</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={currentStep === totalSteps ? handleSubmit : handleNext}
                        disabled={isSubmitting}
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 16,
                            borderRadius: 12,
                            backgroundColor: isSubmitting ? AURORA.textMuted : AURORA.blue,
                            opacity: isSubmitting ? 0.7 : 1
                        }}
                    >
                        <Text style={{ fontWeight: '600', color: AURORA.textPrimary, fontSize: 16 }}>
                            {isSubmitting ? 'Saving...' : (currentStep === totalSteps ? 'Complete Check-In' : 'Continue')}
                        </Text>
                        {!isSubmitting && currentStep < totalSteps && (
                            <ArrowRight size={18} color={AURORA.textPrimary} style={{ marginLeft: 8 }} />
                        )}
                        {!isSubmitting && currentStep === totalSteps && (
                            <Check size={18} color={AURORA.textPrimary} style={{ marginLeft: 8 }} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}
