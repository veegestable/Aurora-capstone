import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Image, PanResponder } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { moodService } from '../services/mood.service';
import { useAuth } from '../stores/AuthContext';
import { useUserDaySettings } from '../stores/UserDaySettingsContext';
import { Sparkles, Zap, ClipboardList, ArrowLeft, ArrowRight, Check, Heart } from 'lucide-react-native';
import { AURORA } from '../constants/aurora-colors';
import {
    calculateStressLevel,
    classifyStress,
    getDailyFeedback,
} from '../utils/analytics/ethicsDailyAnalytics';
import { logSuddenMoodDropIfNeeded } from '../utils/analytics/suddenMoodChange';
import { getMostRecentLogNotOnSameCalendarDay } from '../utils/analytics/dateKeys';
import { getDayKey } from '../utils/dayKey';
import { getDailyContext, setDailyContext } from '../services/mood-firestore-v2.service';

interface MoodCheckInProps {
    onComplete?: () => void;
}

interface DetectedEmotion {
    emotion: string;
    confidence: number;
    color: string;
}

const SimpleSlider = ({
    value,
    onValueChange,
    minimumTrackTintColor,
    thumbTintColor,
    onSlidingStart,
    onSlidingComplete,
}: any) => {
    const widthRef = useRef(0);
    const startValue = useRef(0);
    const onValueChangeRef = useRef(onValueChange);
    const onSlidingStartRef = useRef(onSlidingStart);
    const onSlidingCompleteRef = useRef(onSlidingComplete);
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
                    const newVal = Math.max(0, Math.min(1, startValue.current + dx / width));
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
                <View
                    style={{
                        width: `${value * 100}%`,
                        height: '100%',
                        backgroundColor: minimumTrackTintColor,
                        borderRadius: 2,
                    }}
                />
            </View>
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    left: `${value * 100}%`,
                    marginLeft: -10,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: thumbTintColor,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                    borderWidth: 2,
                    borderColor: AURORA.bg,
                }}
            />
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
    { name: 'neutral', color: AURORA.moodNeutral, label: 'Neutral', image: require('../assets/neutral.png') },
];

export function MoodCheckIn({ onComplete }: MoodCheckInProps) {
    const { user } = useAuth();
    const { dayResetHour, timezone } = useUserDaySettings();
    const [selectedEmotions, setSelectedEmotions] = useState<DetectedEmotion[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [energyLevel, setEnergyLevel] = useState(3);
    const [stressLevel, setStressLevel] = useState(3);
    const [intensityTen, setIntensityTen] = useState(6);
    const [currentStep, setCurrentStep] = useState(1);
    const [isScrollEnabled, setIsScrollEnabled] = useState(true);
    const [dayKey, setDayKey] = useState('');
    const [needsDailyContextStep, setNeedsDailyContextStep] = useState(false);
    const [contextLoaded, setContextLoaded] = useState(false);

    const [examsCount, setExamsCount] = useState(0);
    const [quizzesCount, setQuizzesCount] = useState(0);
    const [deadlinesCount, setDeadlinesCount] = useState(0);
    const [assignmentsCount, setAssignmentsCount] = useState(0);
    const [contextNotes, setContextNotes] = useState('');

    const selectedEmotion = selectedEmotions[0];
    const totalSteps = needsDailyContextStep ? 3 : 2;

    const recomputeDayKey = () => {
        const dk = getDayKey(new Date(), dayResetHour, timezone);
        setDayKey(dk);
        return dk;
    };

    useEffect(() => {
        recomputeDayKey();
    }, [dayResetHour, timezone]);

    useEffect(() => {
        const loadGate = async () => {
            if (!user?.id || !dayKey) return;
            try {
                const existing = await getDailyContext(user.id, dayKey);
                setNeedsDailyContextStep(!existing);
                if (existing) {
                    setExamsCount(existing.exams ?? 0);
                    setQuizzesCount(existing.quizzes ?? 0);
                    setDeadlinesCount(existing.deadlines ?? 0);
                    setAssignmentsCount(existing.assignments ?? 0);
                    setContextNotes(existing.notes ?? '');
                }
            } catch (e) {
                console.error('Daily context gate', e);
                setNeedsDailyContextStep(true);
            } finally {
                setContextLoaded(true);
            }
        };
        loadGate();
    }, [user?.id, dayKey]);

    const handleNext = () => {
        if (needsDailyContextStep && currentStep === 1) {
            setCurrentStep(2);
            return;
        }
        if (!needsDailyContextStep && currentStep === 1) {
            if (selectedEmotions.length === 0) {
                Alert.alert('Please select a mood', 'How are you feeling right now?');
                return;
            }
            setCurrentStep(2);
            return;
        }
        if (needsDailyContextStep && currentStep === 2) {
            if (selectedEmotions.length === 0) {
                Alert.alert('Please select a mood', 'How are you feeling right now?');
                return;
            }
            setCurrentStep(3);
            return;
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep((c) => c - 1);
    };

    const handleManualEmotionSelect = (emotion: (typeof MANUAL_EMOTIONS)[0]) => {
        setSelectedEmotions([
            {
                emotion: emotion.name,
                confidence: intensityTen / 10,
                color: emotion.color,
            },
        ]);
    };

    const checkCounselorReferral = (stress: number, emotions: DetectedEmotion[]) => {
        const negativeEmotions = ['sadness', 'anger', 'fear'];
        const hasHighNegativeEmotion = emotions.some(
            (e) => negativeEmotions.includes(e.emotion) && e.confidence > 0.6
        );
        if (stress >= 4 || hasHighNegativeEmotion) {
            Alert.alert(
                'Need Support?',
                'It looks like you might be going through a tough time. Would you like to connect with a counselor?',
                [
                    { text: 'No thanks', style: 'cancel' },
                    {
                        text: 'Yes, please',
                        onPress: () => {
                            onComplete?.();
                        },
                    },
                ]
            );
        }
    };

    const handleSubmit = async () => {
        if (selectedEmotions.length === 0) {
            Alert.alert('Error', 'Please select a mood');
            return;
        }
        if (!user) {
            Alert.alert('Error', 'Please log in to save mood');
            return;
        }
        const dk = dayKey || recomputeDayKey();
        try {
            setIsSubmitting(true);
            checkCounselorReferral(stressLevel, selectedEmotions);

            const moodData = {
                emotions: selectedEmotions.map((e) => ({
                    ...e,
                    confidence: intensityTen / 10,
                })),
                notes: '',
                log_date: new Date(),
                energy_level: energyLevel * 2,
                stress_level: stressLevel * 2,
                dayKey: dk,
                detection_method: 'manual' as const,
            };

            await moodService.createMoodLog(moodData);

            try {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 14);
                const recent = await moodService.getMoodLogs(
                    user.id,
                    weekAgo.toISOString(),
                    new Date().toISOString()
                );
                const prev = getMostRecentLogNotOnSameCalendarDay(
                    recent as { log_date: Date; energy_level?: number }[],
                    new Date()
                );
                logSuddenMoodDropIfNeeded(prev?.energy_level, energyLevel * 2);
            } catch {
                /* silent */
            }

            setIsSubmitting(false);
            setIsSubmitted(true);
            setNeedsDailyContextStep(false);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to check in');
            setIsSubmitting(false);
        }
    };

    const saveContextAndAdvance = async () => {
        if (!user?.id || !dayKey) return;
        try {
            await             setDailyContext(user.id, dayKey, {
                exams: examsCount,
                quizzes: quizzesCount,
                deadlines: deadlinesCount,
                assignments: assignmentsCount,
                notes: contextNotes.trim(),
            });
            setNeedsDailyContextStep(false);
            setCurrentStep(1);
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not save daily context');
        }
    };

    const Counter = ({
        label,
        value,
        onChange,
    }: {
        label: string;
        value: number;
        onChange: (v: number) => void;
    }) => (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: AURORA.border,
            }}
        >
            <Text style={{ color: AURORA.textPrimary, fontWeight: '500', fontSize: 16, flex: 1 }}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                    onPress={() => onChange(Math.max(0, value - 1))}
                    style={{
                        width: 36,
                        height: 36,
                        backgroundColor: AURORA.cardAlt,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    activeOpacity={0.7}
                >
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: AURORA.textSec }}>−</Text>
                </TouchableOpacity>
                <View
                    style={{
                        width: 40,
                        height: 40,
                        backgroundColor: AURORA.cardDark,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: AURORA.textPrimary }}>{value}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => onChange(value + 1)}
                    style={{
                        width: 36,
                        height: 36,
                        backgroundColor: 'rgba(45, 107, 255, 0.15)',
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    activeOpacity={0.7}
                >
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: AURORA.blue }}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const stepLabels = needsDailyContextStep ? ['Today', 'Mood', 'Energy'] : ['Mood', 'Energy'];

    const StepIndicator = () => (
        <View style={{ marginBottom: 32, paddingHorizontal: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
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
                                    backgroundColor:
                                        currentStep > step ? AURORA.green : currentStep === step ? AURORA.blue : AURORA.cardAlt,
                                }}
                            >
                                {currentStep > step ? (
                                    <Check size={20} color={AURORA.textPrimary} strokeWidth={3} />
                                ) : (
                                    <Text
                                        style={{
                                            fontWeight: 'bold',
                                            color: currentStep === step ? AURORA.textPrimary : AURORA.textMuted,
                                        }}
                                    >
                                        {step}
                                    </Text>
                                )}
                            </View>
                            <Text
                                style={{
                                    fontSize: 12,
                                    fontWeight: '500',
                                    color: currentStep >= step ? AURORA.blue : AURORA.textMuted,
                                }}
                            >
                                {stepLabels[step - 1]}
                            </Text>
                        </View>
                        {step < totalSteps && (
                            <View
                                style={{
                                    flex: 1,
                                    height: 4,
                                    marginHorizontal: 12,
                                    borderRadius: 2,
                                    backgroundColor: currentStep > step ? AURORA.green : AURORA.cardAlt,
                                }}
                            />
                        )}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );

    const taskTotal = examsCount + quizzesCount + deadlinesCount + assignmentsCount;

    if (isSubmitted) {
        const moodScale = Math.min(5, Math.max(1, energyLevel));
        const stressScore = calculateStressLevel(moodScale, taskTotal);
        const stressBand = classifyStress(stressScore);
        const dailyBody = getDailyFeedback(stressBand, moodScale);
        const isPositive = moodScale >= 4 && stressBand !== 'High';
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: AURORA.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                }}
            >
                <Animatable.View
                    animation="zoomIn"
                    duration={520}
                    useNativeDriver
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
                            backgroundColor: isPositive ? 'rgba(254, 189, 3, 0.15)' : 'rgba(45, 107, 255, 0.15)',
                        }}
                    >
                        {isPositive ? <Sparkles size={48} color={AURORA.amber} /> : <Heart size={48} color={AURORA.blue} />}
                    </View>

                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        <Text
                            style={{
                                fontSize: 24,
                                fontWeight: 'bold',
                                color: AURORA.textPrimary,
                                textAlign: 'center',
                                marginBottom: 12,
                            }}
                        >
                            Thanks for checking in
                        </Text>
                        <Text
                            style={{
                                color: AURORA.textSec,
                                textAlign: 'center',
                                fontSize: 16,
                                lineHeight: 24,
                                paddingHorizontal: 16,
                            }}
                        >
                            {dailyBody}
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
                            gap: 12,
                        }}
                    >
                        <View
                            style={{
                                width: 16,
                                height: 16,
                                borderRadius: 8,
                                backgroundColor: selectedEmotion?.color || AURORA.blue,
                            }}
                        />
                        <Text style={{ fontWeight: '600', color: AURORA.textPrimary, textTransform: 'capitalize' }}>
                            Feeling {selectedEmotion?.emotion || 'great'}
                        </Text>
                        <Text style={{ color: AURORA.textMuted }}>•</Text>
                        <Text style={{ color: AURORA.textSec }}>Intensity {intensityTen}/10</Text>
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
                            onPress={() => {
                                setIsSubmitted(false);
                                setCurrentStep(1);
                                setSelectedEmotions([]);
                            }}
                            style={{
                                paddingVertical: 12,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: AURORA.textSec, fontWeight: '500' }}>Log another check-in</Text>
                        </TouchableOpacity>
                    </View>
                </Animatable.View>
            </View>
        );
    }

    if (!contextLoaded) {
        return (
            <View style={{ flex: 1, backgroundColor: AURORA.bg, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: AURORA.textSec }}>Loading…</Text>
            </View>
        );
    }

    const isContextStep = needsDailyContextStep && currentStep === 1;
    const isMoodStep = (needsDailyContextStep && currentStep === 2) || (!needsDailyContextStep && currentStep === 1);
    const isVitalityStep = (needsDailyContextStep && currentStep === 3) || (!needsDailyContextStep && currentStep === 2);

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
                        {isContextStep && `Hey ${user?.full_name ? user.full_name.split(' ')[0] : 'there'}!`}
                        {isMoodStep && "How are you feeling?"}
                        {isVitalityStep && 'Stress & energy'}
                    </Text>
                    <Text style={{ color: AURORA.textSec, textAlign: 'center', fontSize: 16 }}>
                        {isContextStep && "A quick look at today's workload (once per day)."}
                        {isMoodStep && 'Pick one mood and set intensity.'}
                        {isVitalityStep && 'Sliders use a 1–5 scale.'}
                    </Text>
                </View>

                <StepIndicator />

                {isContextStep && (
                    <View style={{ gap: 16 }}>
                        <View style={{ backgroundColor: AURORA.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: AURORA.border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <ClipboardList size={20} color={AURORA.blue} />
                                <Text style={{ fontWeight: 'bold', fontSize: 18, color: AURORA.textPrimary }}>Daily context</Text>
                            </View>
                            <Counter label="Exams" value={examsCount} onChange={setExamsCount} />
                            <Counter label="Quizzes" value={quizzesCount} onChange={setQuizzesCount} />
                            <Counter label="Deadlines" value={deadlinesCount} onChange={setDeadlinesCount} />
                            <Counter label="Assignments" value={assignmentsCount} onChange={setAssignmentsCount} />
                            <Text style={{ color: AURORA.textSec, marginTop: 12, marginBottom: 8 }}>Notes (optional)</Text>
                            <TextInput
                                style={{
                                    backgroundColor: AURORA.cardAlt,
                                    borderWidth: 1,
                                    borderColor: AURORA.border,
                                    borderRadius: 12,
                                    padding: 12,
                                    color: AURORA.textPrimary,
                                    minHeight: 80,
                                    textAlignVertical: 'top',
                                }}
                                placeholder="Anything about today…"
                                placeholderTextColor={AURORA.textMuted}
                                multiline
                                value={contextNotes}
                                onChangeText={setContextNotes}
                            />
                        </View>
                    </View>
                )}

                {isMoodStep && (
                    <View style={{ gap: 24 }}>
                        <View style={{ backgroundColor: AURORA.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AURORA.border }}>
                            <Text style={{ fontWeight: '600', color: AURORA.textPrimary, marginBottom: 16, textAlign: 'center' }}>
                                Select how you're feeling
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
                                {MANUAL_EMOTIONS.map((emotion) => {
                                    const isSelected = selectedEmotions.some((e) => e.emotion === emotion.name);
                                    return (
                                        <TouchableOpacity
                                            key={emotion.name}
                                            onPress={() => handleManualEmotionSelect(emotion)}
                                            style={{
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 72,
                                                height: 88,
                                                borderRadius: 16,
                                                backgroundColor: isSelected ? `${emotion.color}20` : AURORA.cardAlt,
                                                borderWidth: isSelected ? 2 : 1,
                                                borderColor: isSelected ? emotion.color : AURORA.border,
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Image source={emotion.image} style={{ width: 40, height: 40 }} resizeMode="contain" />
                                            <Text
                                                style={{
                                                    fontWeight: '500',
                                                    fontSize: 12,
                                                    marginTop: 6,
                                                    color: isSelected ? emotion.color : AURORA.textSec,
                                                }}
                                            >
                                                {emotion.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {selectedEmotions.length > 0 && (
                            <View style={{ backgroundColor: AURORA.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: AURORA.border }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <Zap size={16} color={getEmotionColor(selectedEmotions[0]?.emotion || 'neutral')} />
                                    <Text style={{ fontWeight: 'bold', color: AURORA.textPrimary }}>Intensity (1–10)</Text>
                                </View>
                                <SimpleSlider
                                    value={(intensityTen - 1) / 9}
                                    onValueChange={(val: number) => setIntensityTen(Math.max(1, Math.min(10, Math.round(1 + val * 9))))}
                                    minimumTrackTintColor={getEmotionColor(selectedEmotions[0]?.emotion || 'neutral')}
                                    thumbTintColor={getEmotionColor(selectedEmotions[0]?.emotion || 'neutral')}
                                    onSlidingStart={() => setIsScrollEnabled(false)}
                                    onSlidingComplete={() => setIsScrollEnabled(true)}
                                />
                                <Text style={{ color: AURORA.textSec, marginTop: 8, textAlign: 'center' }}>{intensityTen}</Text>
                            </View>
                        )}
                    </View>
                )}

                {isVitalityStep && (
                    <View style={{ gap: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: AURORA.card, borderRadius: 16, borderWidth: 1, borderColor: AURORA.border, alignSelf: 'center' }}>
                            <Text style={{ color: AURORA.textSec, marginRight: 8 }}>Mood</Text>
                            <View style={{ width: 12, height: 12, borderRadius: 6, marginRight: 8, backgroundColor: selectedEmotion?.color || AURORA.blue }} />
                            <Text style={{ fontWeight: 'bold', color: AURORA.textPrimary, textTransform: 'capitalize' }}>
                                {selectedEmotion?.emotion || '—'}
                            </Text>
                        </View>

                        <View style={{ backgroundColor: AURORA.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: AURORA.border }}>
                            <Text style={{ fontWeight: '600', color: AURORA.textPrimary, marginBottom: 12 }}>Energy (1–5)</Text>
                            <SimpleSlider
                                value={(energyLevel - 1) / 4}
                                onValueChange={(val: number) => setEnergyLevel(Math.max(1, Math.min(5, Math.round(1 + val * 4))))}
                                minimumTrackTintColor={AURORA.amber}
                                thumbTintColor={AURORA.amber}
                                onSlidingStart={() => setIsScrollEnabled(false)}
                                onSlidingComplete={() => setIsScrollEnabled(true)}
                            />
                            <Text style={{ color: AURORA.amber, fontWeight: '700', marginTop: 8 }}>{energyLevel}</Text>

                            <Text style={{ fontWeight: '600', color: AURORA.textPrimary, marginTop: 24, marginBottom: 12 }}>Stress (1–5)</Text>
                            <SimpleSlider
                                value={(stressLevel - 1) / 4}
                                onValueChange={(val: number) => setStressLevel(Math.max(1, Math.min(5, Math.round(1 + val * 4))))}
                                minimumTrackTintColor={AURORA.red}
                                thumbTintColor={AURORA.red}
                                onSlidingStart={() => setIsScrollEnabled(false)}
                                onSlidingComplete={() => setIsScrollEnabled(true)}
                            />
                            <Text style={{ color: AURORA.red, fontWeight: '700', marginTop: 8 }}>{stressLevel}</Text>
                        </View>
                    </View>
                )}
            </View>

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
                                backgroundColor: AURORA.card,
                            }}
                        >
                            <ArrowLeft size={18} color={AURORA.textSec} />
                            <Text style={{ fontWeight: '600', color: AURORA.textSec, marginLeft: 8 }}>Back</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={
                            isContextStep
                                ? saveContextAndAdvance
                                : currentStep === totalSteps
                                  ? handleSubmit
                                  : handleNext
                        }
                        disabled={isSubmitting}
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 16,
                            borderRadius: 12,
                            backgroundColor: isSubmitting ? AURORA.textMuted : AURORA.blue,
                            opacity: isSubmitting ? 0.7 : 1,
                        }}
                    >
                        <Text style={{ fontWeight: '600', color: AURORA.textPrimary, fontSize: 16 }}>
                            {isSubmitting ? 'Saving…' : isContextStep ? 'Continue' : currentStep === totalSteps ? 'Save check-in' : 'Continue'}
                        </Text>
                        {!isSubmitting && !isContextStep && currentStep < totalSteps && (
                            <ArrowRight size={18} color={AURORA.textPrimary} style={{ marginLeft: 8 }} />
                        )}
                        {!isSubmitting && currentStep === totalSteps && <Check size={18} color={AURORA.textPrimary} style={{ marginLeft: 8 }} />}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}
