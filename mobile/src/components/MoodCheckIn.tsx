import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, PanResponder, ScrollView, Text, TouchableOpacity, View, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Animatable from 'react-native-animatable';
import { SvgUri } from 'react-native-svg';
import Animated, {
    Easing,
    ReduceMotion,
    cancelAnimation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import {
    ArrowLeft,
    ArrowRight,
    Briefcase,
    Check,
    GraduationCap,
    Heart,
    MoonStar,
    PartyPopper,
    ShieldPlus,
    Sparkles,
    Users,
    Zap,
    MessageSquare,
    CircleHelp,
} from 'lucide-react-native';
import { moodService } from '../services/mood.service';
import { AURORA } from '../constants/aurora-colors';
import { useAuth } from '../stores/AuthContext';
import { triggerHaptic } from '../utils/haptics';
import { EmotionDetection } from './EmotionDetection';
import { useUserDaySettings } from '../stores/UserDaySettingsContext';
import {
    calculateStressLevel,
    classifyStress,
    getDailyFeedback,
} from '../utils/analytics/ethicsDailyAnalytics';
import { logSuddenMoodDropIfNeeded } from '../utils/analytics/suddenMoodChange';
import { getMostRecentLogNotOnSameCalendarDay } from '../utils/analytics/dateKeys';
import { getDayKey } from '../utils/dayKey';
import {
    getDailyContext,
    setDailyContext,
    type ContextCategoryKey,
    type DailyContextDoc,
    type SleepQuality,
} from '../services/mood-firestore-v2.service';

interface MoodCheckInProps {
    onComplete?: () => void;
    initialMood?: string | null;
}

interface DetectedEmotion {
    emotion: string;
    confidence: number;
    color: string;
}

type CategoryConfig = {
    key: ContextCategoryKey;
    title: string;
    helper: string;
    icon: React.ReactNode;
    tags: string[];
};

const SCHOOL_TAGS = ['classes', 'study', 'quiz', 'exam', 'homework', 'deadline', 'group-project', 'presentation'];

const MANUAL_EMOTIONS = [
    { name: 'joy', color: AURORA.moodHappy, label: 'Happy', image: require('../assets/moods3d/happy-3d.png'), svg: require('../assets/moodsSvg/happy1.svg') },
    { name: 'sadness', color: AURORA.moodSad, label: 'Sad', image: require('../assets/moods3d/sad-3d.png'), svg: require('../assets/moodsSvg/sad.svg') },
    { name: 'anger', color: AURORA.moodAngry, label: 'Angry', image: require('../assets/moods3d/angry-3d.png'), svg: require('../assets/moodsSvg/angry.svg') },
    { name: 'surprise', color: AURORA.moodSurprise, label: 'Surprise', image: require('../assets/moods3d/surprise-3d.png'), svg: require('../assets/moodsSvg/surprise.svg') },
    { name: 'neutral', color: AURORA.moodNeutral, label: 'Neutral', image: require('../assets/moods3d/neutral-3d.png'), svg: require('../assets/moodsSvg/neutral4.svg') },
];

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
                onSlidingStartRef.current?.();
                const width = widthRef.current;
                if (width <= 0) return;
                const val = Math.max(0, Math.min(1, evt.nativeEvent.locationX / width));
                startValue.current = val;
                onValueChangeRef.current?.(val);
            },
            onPanResponderMove: (_evt, gestureState) => {
                const width = widthRef.current;
                if (width <= 0) return;
                const newVal = Math.max(0, Math.min(1, startValue.current + gestureState.dx / width));
                onValueChangeRef.current?.(newVal);
            },
            onPanResponderRelease: () => onSlidingCompleteRef.current?.(),
            onPanResponderTerminate: () => onSlidingCompleteRef.current?.(),
        })
    ).current;

    return (
        <View
            style={{ height: 40, width: '100%', justifyContent: 'center' }}
            onLayout={(e) => {
                widthRef.current = e.nativeEvent.layout.width;
            }}
            {...panResponder.panHandlers}
        >
            <View pointerEvents="none" style={{ height: 4, backgroundColor: AURORA.cardAlt, borderRadius: 2 }}>
                <View style={{ width: `${value * 100}%`, height: '100%', backgroundColor: minimumTrackTintColor, borderRadius: 2 }} />
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
                    borderWidth: 2,
                    borderColor: AURORA.bg,
                }}
            />
        </View>
    );
};

export function MoodCheckIn({ onComplete, initialMood = null }: MoodCheckInProps) {
    const { user } = useAuth();
    const { dayResetHour, timezone, academicContextEnabled, enabledContextCategories } = useUserDaySettings();

    const [selectedEmotions, setSelectedEmotions] = useState<DetectedEmotion[]>([]);
    const [moodInputMode, setMoodInputMode] = useState<'manual' | 'selfie'>('manual');
    const [detectionMethod, setDetectionMethod] = useState<'manual' | 'selfie_ai'>('manual');
    const [intensityTen, setIntensityTen] = useState(6);
    const [energyLevel, setEnergyLevel] = useState(3);
    const [stressLevel, setStressLevel] = useState(3);
    const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>(null);
    const [dailyContext, setDailyContextState] = useState<DailyContextDoc | null>(null);
    const [sleepCapturedToday, setSleepCapturedToday] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [journalText, setJournalText] = useState('');
    const [journalEdited, setJournalEdited] = useState(false);
    const [showJournalEditor, setShowJournalEditor] = useState(false);

    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [dayKey, setDayKey] = useState('');
    const [isScrollEnabled, setIsScrollEnabled] = useState(true);

    const selectedEmotion = selectedEmotions[0];
    const selectedManualEmotion =
        MANUAL_EMOTIONS.find((emotion) => emotion.name === selectedEmotion?.emotion) ?? MANUAL_EMOTIONS[4];
    const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'there';
    const totalSteps = 3;

    const floatingProgress = useSharedValue(0);
    useEffect(() => {
        floatingProgress.value = withRepeat(
            withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.Never }),
            -1,
            true
        );
        return () => cancelAnimation(floatingProgress);
    }, [floatingProgress]);

    const floatingMoodStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: interpolate(floatingProgress.value, [0, 1], [0, -10]) },
            { scale: interpolate(floatingProgress.value, [0, 1], [1, 1.02]) },
        ],
    }));
    const floatingShadowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(floatingProgress.value, [0, 1], [0.24, 0.12]),
        transform: [
            { scaleX: interpolate(floatingProgress.value, [0, 1], [1, 0.86]) },
            { scaleY: interpolate(floatingProgress.value, [0, 1], [1, 0.86]) },
        ],
    }));

    const renderMoodVisual = (emotion: (typeof MANUAL_EMOTIONS)[0], size: number) => {
        const source = Image.resolveAssetSource(emotion.svg);
        if (source?.uri) return <SvgUri uri={source.uri} width={size} height={size} />;
        return <Image source={emotion.image} style={{ width: size, height: size }} resizeMode="contain" />;
    };

    const enabledCategorySet = new Set<ContextCategoryKey>(enabledContextCategories);
    const isCategoryEnabled = (k: ContextCategoryKey) =>
        k === 'school' ? academicContextEnabled && enabledCategorySet.has('school') : enabledCategorySet.has(k);

    const categoryConfigs: CategoryConfig[] = [
        { key: 'school' as const, title: 'School', helper: 'Academic activities and pressure.', icon: <GraduationCap size={16} color={AURORA.blue} />, tags: SCHOOL_TAGS },
        { key: 'health' as const, title: 'Health', helper: 'Physical condition and body signals.', icon: <ShieldPlus size={16} color={AURORA.green} />, tags: ['headache', 'pain', 'sick', 'medication', 'exercise', 'nap', 'period', 'low-appetite', 'binge-eating'] },
        { key: 'social' as const, title: 'Social', helper: 'Relationships and interactions.', icon: <Users size={16} color={AURORA.purple} />, tags: ['friends', 'family', 'partner', 'conflict', 'alone', 'social-media'] },
        { key: 'fun' as const, title: 'Fun / Leisure', helper: 'Recreation and enjoyment.', icon: <PartyPopper size={16} color={AURORA.amber} />, tags: ['gaming', 'movie-series', 'music', 'travel', 'shopping', 'restaurant', 'hobby', 'outdoor'] },
        { key: 'productivity' as const, title: 'Productivity', helper: 'Workload and life tasks.', icon: <Briefcase size={16} color={AURORA.red} />, tags: ['work', 'chores', 'finance', 'commute', 'screen-overload'] },
    ].filter((x) => isCategoryEnabled(x.key));

    useEffect(() => {
        setDayKey(getDayKey(new Date(), dayResetHour, timezone));
    }, [dayResetHour, timezone]);

    useEffect(() => {
        const loadDaily = async () => {
            if (!user?.id || !dayKey) return;
            try {
                const ctx = await getDailyContext(user.id, dayKey);
                setDailyContextState(ctx);
                if (ctx?.sleepQuality) {
                    setSleepQuality(ctx.sleepQuality);
                    setSleepCapturedToday(true);
                } else {
                    setSleepCapturedToday(false);
                }
            } catch {
                setDailyContextState(null);
                setSleepCapturedToday(false);
            }
        };
        loadDaily();
    }, [user?.id, dayKey]);

    useEffect(() => {
        if (!initialMood) return;
        const emotion = MANUAL_EMOTIONS.find((item) => item.name === initialMood);
        if (!emotion) return;
        setMoodInputMode('manual');
        setDetectionMethod('manual');
        setSelectedEmotions([{ emotion: emotion.name, confidence: 0.6, color: emotion.color }]);
    }, [initialMood]);

    const closeModalThenRoute = (path: '/(student)/messages' | '/(student)/resources') => {
        onComplete?.();
        setTimeout(() => router.push(path), 0);
    };

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
    };

    const describeEnergy = (value: number) => {
        if (value <= 1) return 'very low';
        if (value === 2) return 'low';
        if (value === 3) return 'moderate';
        if (value === 4) return 'high';
        return 'very high';
    };

    const describeStress = (value: number) => {
        if (value <= 1) return 'very calm';
        if (value === 2) return 'slightly tense';
        if (value === 3) return 'moderately stressed';
        if (value === 4) return 'highly stressed';
        return 'overwhelmed';
    };

    const tagPhrase = (tags: string[], maxVisible = 5) => {
        const clean = tags.filter(Boolean);
        if (clean.length === 0) return '';
        if (clean.length === 1) return clean[0];
        if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;

        const visible = clean.slice(0, maxVisible);
        const extraCount = clean.length - visible.length;
        const base =
            visible.length === 3
                ? `${visible[0]}, ${visible[1]}, and ${visible[2]}`
                : `${visible.slice(0, -1).join(', ')}, and ${visible[visible.length - 1]}`;

        return extraCount > 0 ? `${base} (+${extraCount} more)` : base;
    };

    const buildJournalDraft = () => {
        const selectedLabel =
            MANUAL_EMOTIONS.find((emotion) => emotion.name === selectedEmotion?.emotion)?.label?.toLowerCase() ?? 'neutral';
        const stressTone =
            stressLevel >= 4 ? 'I felt emotionally heavy because of it.' : stressLevel <= 2 ? 'It felt manageable overall.' : 'It sat in the middle of my day.';
        const selectedCategoryKeys = categoryConfigs
            .filter((category) => category.tags.some((tag) => selectedTags.includes(tag)))
            .map((category) => category.key);
        const categoryLines: string[] = [];

        if (selectedCategoryKeys.includes('school')) {
            const schoolTags = selectedTags.filter((tag) => SCHOOL_TAGS.includes(tag));
            categoryLines.push(
                schoolTags.length > 0
                    ? `In school, I dealt with ${tagPhrase(schoolTags)}, and it affected my focus.`
                    : 'School tasks affected my mood today.'
            );
        }

        if (selectedCategoryKeys.includes('fun')) {
            const funTags = (categoryConfigs.find((category) => category.key === 'fun')?.tags ?? [])
                .filter((tag) => selectedTags.includes(tag))
                ;
            categoryLines.push(
                funTags.length > 0
                    ? `For fun, I spent time on ${tagPhrase(funTags)}, and it changed how my day felt.`
                    : 'Leisure time played a part in my mood today.'
            );
        }

        if (selectedCategoryKeys.includes('social')) {
            const socialTags = (categoryConfigs.find((category) => category.key === 'social')?.tags ?? [])
                .filter((tag) => selectedTags.includes(tag))
                ;
            categoryLines.push(
                socialTags.length > 0
                    ? `Socially, ${tagPhrase(socialTags)} stood out and shaped my emotions.`
                    : 'Social interactions influenced how I felt.'
            );
        }

        if (selectedCategoryKeys.includes('health')) {
            const healthTags = (categoryConfigs.find((category) => category.key === 'health')?.tags ?? [])
                .filter((tag) => selectedTags.includes(tag))
                ;
            categoryLines.push(
                healthTags.length > 0
                    ? `Health-wise, I noticed ${tagPhrase(healthTags)}, and it really shaped how I felt inside. ${stressTone}`
                    : `My physical condition influenced my emotions today. ${stressTone}`
            );
        }

        if (selectedCategoryKeys.includes('productivity')) {
            const productivityTags = (categoryConfigs.find((category) => category.key === 'productivity')?.tags ?? [])
                .filter((tag) => selectedTags.includes(tag))
                ;
            categoryLines.push(
                productivityTags.length > 0
                    ? `For productivity, juggling ${tagPhrase(productivityTags)} made me feel ${stressLevel >= 4 ? 'pressured and stretched' : 'busy but trying to stay steady'}.`
                    : `My tasks and responsibilities affected my mood, and I could feel that pressure build at times.`
            );
        }

        const summaryLine = `Today I felt ${selectedLabel}, with ${describeEnergy(energyLevel)} energy and ${describeStress(stressLevel)} stress.`;
        const body = categoryLines.join(' ');
        return body ? `${summaryLine} ${body}` : summaryLine;
    };

    useEffect(() => {
        if (selectedTags.length === 0) {
            if (!journalEdited) {
                setJournalText('');
                setShowJournalEditor(false);
            }
            return;
        }
        if (!journalEdited) {
            setJournalText(buildJournalDraft());
        }
    }, [selectedTags, energyLevel, stressLevel, selectedEmotion?.emotion, journalEdited]);

    const handleNext = () => {
        if (currentStep === 1 && selectedEmotions.length === 0) {
            Alert.alert('Please select a mood', 'Pick your current emotion before continuing.');
            return;
        }
        if (currentStep === 2 && !sleepCapturedToday && !sleepQuality) {
            Alert.alert('Sleep quality is required', 'Please set sleep quality once for today.');
            return;
        }
        if (currentStep < totalSteps) setCurrentStep((c) => c + 1);
    };

    const applyAnalyzedMood = (emotion: DetectedEmotion) => {
        setSelectedEmotions([emotion]);
        setDetectionMethod('selfie_ai');
        if (currentStep < totalSteps) {
            setCurrentStep((c) => c + 1);
        }
    };

    const handleSubmit = async () => {
        if (!user) {
            Alert.alert('Error', 'Please log in to save mood');
            return;
        }
        if (selectedEmotions.length === 0 || (!sleepCapturedToday && !sleepQuality)) {
            Alert.alert('Missing data', 'Mood is required. Sleep quality is needed only once per day.');
            return;
        }

        const dk = dayKey || getDayKey(new Date(), dayResetHour, timezone);
        try {
            setIsSubmitting(true);
            await moodService.createMoodLog({
                emotions: selectedEmotions.map((e) => ({ ...e, confidence: intensityTen / 10 })),
                log_date: new Date(),
                energy_level: energyLevel * 2,
                stress_level: stressLevel * 2,
                sleep_quality: sleepQuality || 'fair',
                dayKey: dk,
                event_categories: categoryConfigs.filter((c) => c.tags.some((t) => selectedTags.includes(t))).map((c) => c.key),
                event_tags: selectedTags,
                notes: journalText.trim(),
                journal_source: journalEdited ? 'manual' : 'auto',
                detection_method: detectionMethod,
            });

            const shouldUpdateDailyContext = !sleepCapturedToday && !!sleepQuality;
            if (shouldUpdateDailyContext) {
                const existing = await getDailyContext(user.id, dk);
                await setDailyContext(user.id, dk, {
                    exams: existing?.exams || 0,
                    quizzes: existing?.quizzes || 0,
                    deadlines: existing?.deadlines || 0,
                    assignments: existing?.assignments || 0,
                    notes: existing?.notes || '',
                    sleepQuality: existing?.sleepQuality || sleepQuality || undefined,
                });
            }

            try {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 14);
                const recent = await moodService.getMoodLogs(user.id, weekAgo.toISOString(), new Date().toISOString());
                const prev = getMostRecentLogNotOnSameCalendarDay(recent as { log_date: Date; energy_level?: number }[], new Date());
                logSuddenMoodDropIfNeeded(prev?.energy_level, energyLevel * 2);
            } catch {
                // no-op
            }

            setIsSubmitting(false);
            setIsSubmitted(true);
        } catch (error: any) {
            setIsSubmitting(false);
            Alert.alert('Error', error?.message || 'Failed to check in');
        }
    };

    const showSelfiePrivacyGuide = () => {
        Alert.alert(
            'Daily selfie privacy',
            'Aurora analyzes visible facial expression to suggest a mood. You can retake, switch to manual check-in, or choose whether to use the analyzed mood before continuing.',
            [{ text: 'Got it' }]
        );
    };

    const showScaleGuide = (type: 'energy' | 'stress') => {
        if (type === 'energy') {
            Alert.alert(
                'Energy scale (1-5)',
                'Rate how energized you feel right now.\n\n1 - Exhausted\n2 - Low energy\n3 - Okay / average\n4 - Active\n5 - Very energized'
            );
            return;
        }
        Alert.alert(
            'Stress scale (1-5)',
            'Rate how pressured or tense you feel right now.\n\n1 - Very calm\n2 - Slightly tense\n3 - Moderate stress\n4 - High stress\n5 - Overwhelmed'
        );
    };

    const showSleepGuide = () => {
        Alert.alert(
            'Sleep quality (once per day)',
            'Log this once per day based on your main/night sleep, not short naps.\n\nUse:\n- Poor: you woke up tired or unrested\n- Fair: okay sleep, but not fully refreshed\n- Good: restful sleep and you feel recovered'
        );
    };

    const schoolTagCount = selectedTags.filter((tag) => SCHOOL_TAGS.includes(tag)).length;
    const workloadBand =
        schoolTagCount === 0 ? 'Light day' : schoolTagCount <= 2 ? 'Balanced load' : schoolTagCount <= 4 ? 'Busy day' : 'Heavy load';

    if (isSubmitted) {
        const moodScale = Math.min(5, Math.max(1, energyLevel));
        const stressBand = classifyStress(calculateStressLevel(moodScale, schoolTagCount));
        const dailyBody = getDailyFeedback(stressBand, moodScale);
        const isPositive = moodScale >= 4 && stressBand !== 'High';
        const totalCheckIns = selectedTags.length + 1;
        return (
            <View style={{ flex: 1, backgroundColor: AURORA.bg, padding: 16, paddingTop: 14, paddingBottom: 20 }}>
                <Animatable.View
                    animation="fadeInUp"
                    duration={520}
                    useNativeDriver
                    style={{
                        backgroundColor: AURORA.card,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                        borderRadius: 18,
                        padding: 14,
                        alignItems: 'center',
                        marginBottom: 10,
                    }}
                >
                    <Animatable.View
                        animation="pulse"
                        duration={2200}
                        iterationCount="infinite"
                        easing="ease-in-out"
                        useNativeDriver
                        style={{ padding: 10, borderRadius: 999, marginBottom: 10, backgroundColor: isPositive ? 'rgba(254, 189, 3, 0.2)' : 'rgba(120, 74, 255, 0.2)' }}
                    >
                        <Image
                            source={require('../assets/logos/logomark light gradient.png')}
                            style={{ width: 30, height: 30 }}
                            resizeMode="contain"
                        />
                    </Animatable.View>
                    <Text style={{ color: AURORA.textPrimary, fontSize: 19, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
                        Thank you for checking in,{'\n'}{firstName}!
                    </Text>
                    <Text style={{ color: AURORA.textSec, textAlign: 'center', fontSize: 13, lineHeight: 18 }}>{dailyBody}</Text>
                </Animatable.View>

                <Animatable.View
                    animation="fadeInUp"
                    delay={90}
                    duration={520}
                    useNativeDriver
                    style={{
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: '#8E3CF7',
                        backgroundColor: 'rgba(65, 31, 109, 0.35)',
                        padding: 14,
                        marginBottom: 10,
                    }}
                >
                    <Text style={{ color: AURORA.textPrimary, fontWeight: '700', fontSize: 16, marginBottom: 10 }}>
                        A supportive space for you
                    </Text>
                    <Animatable.View animation="pulse" duration={2600} delay={500} iterationCount="infinite" easing="ease-in-out" useNativeDriver>
                        <TouchableOpacity
                            onPress={() => closeModalThenRoute('/(student)/messages')}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.14)',
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.2)',
                                paddingVertical: 7,
                                paddingHorizontal: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: AURORA.textPrimary, fontWeight: '700', fontSize: 12 }}>
                                Talk to a Counselor
                            </Text>
                            <MessageSquare size={12} color={AURORA.textPrimary} />
                        </TouchableOpacity>
                    </Animatable.View>
                </Animatable.View>

                <Animatable.View
                    animation="fadeInUp"
                    delay={140}
                    duration={520}
                    useNativeDriver
                    style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                        backgroundColor: AURORA.card,
                        padding: 12,
                        marginBottom: 10,
                    }}
                >
                    <Text style={{ color: AURORA.amber, fontWeight: '700', fontSize: 11, marginBottom: 4 }}>RECOMMENDED</Text>
                    <Text style={{ color: AURORA.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
                        5-minute Breathing Exercise
                    </Text>
                    <Animatable.View animation="fadeIn" duration={800} delay={250} useNativeDriver>
                        <TouchableOpacity onPress={() => closeModalThenRoute('/(student)/resources')} activeOpacity={0.85}>
                            <Animatable.View
                            animation="pulse"
                            duration={2800}
                            delay={800}
                            iterationCount="infinite"
                            easing="ease-in-out"
                            useNativeDriver
                            style={{
                                height: 80,
                                borderRadius: 12,
                                backgroundColor: 'rgba(45, 107, 255, 0.18)',
                                borderWidth: 1,
                                borderColor: AURORA.border,
                                paddingHorizontal: 12,
                                paddingVertical: 9,
                                justifyContent: 'space-between',
                            }}
                        >
                            <Text style={{ color: AURORA.textPrimary, fontWeight: '700', fontSize: 13 }}>Calm reset for your day</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: AURORA.textSec, fontSize: 12 }}>5 Min</Text>
                                <Text style={{ color: AURORA.amber, fontWeight: '700', fontSize: 12 }}>TRY NOW →</Text>
                            </View>
                            </Animatable.View>
                        </TouchableOpacity>
                    </Animatable.View>
                </Animatable.View>

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                    <Animatable.View animation="fadeInUp" delay={180} duration={450} useNativeDriver style={{ flex: 1 }}>
                        <View style={{ backgroundColor: AURORA.card, borderWidth: 1, borderColor: AURORA.border, borderRadius: 14, padding: 10 }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 10, marginBottom: 3 }}>STREAK</Text>
                            <Text style={{ color: AURORA.textPrimary, fontWeight: '800', fontSize: 21 }}>
                                {Math.max(1, schoolTagCount + 1)} Days
                            </Text>
                        </View>
                    </Animatable.View>
                    <Animatable.View animation="fadeInUp" delay={240} duration={450} useNativeDriver style={{ flex: 1 }}>
                        <View style={{ backgroundColor: AURORA.card, borderWidth: 1, borderColor: AURORA.border, borderRadius: 14, padding: 10 }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 10, marginBottom: 3 }}>CHECK-INS</Text>
                            <Text style={{ color: AURORA.textPrimary, fontWeight: '800', fontSize: 21 }}>
                                {totalCheckIns}
                            </Text>
                        </View>
                    </Animatable.View>
                </View>

                <Animatable.View
                    animation="fadeInUp"
                    delay={260}
                    duration={500}
                    useNativeDriver
                    style={{
                        borderRadius: 999,
                        shadowColor: '#6A35FF',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.45,
                        shadowRadius: 18,
                        elevation: 10,
                    }}
                >
                    <Animatable.View animation="pulse" duration={2400} delay={900} iterationCount="infinite" easing="ease-in-out" useNativeDriver>
                        <TouchableOpacity
                            onPress={() => onComplete?.()}
                            activeOpacity={0.9}
                            style={{ borderRadius: 999, overflow: 'hidden' }}
                        >
                            <LinearGradient
                                colors={['#2D6BFF', '#5A46FF', '#8E3CF7']}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={{
                                    width: '100%',
                                    paddingVertical: 13,
                                    borderRadius: 999,
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.22)',
                                }}
                            >
                                <Text style={{ color: AURORA.textPrimary, fontWeight: '700', fontSize: 16 }}>Done</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animatable.View>
                </Animatable.View>
            </View>
        );
    }

    const isMoodStep = currentStep === 1;
    const isVitalityStep = currentStep === 2;
    const isContextStep = currentStep === 3;
    const canContinueCurrentStep =
        (isMoodStep && selectedEmotions.length > 0) ||
        (isVitalityStep && (sleepCapturedToday || !!sleepQuality)) ||
        isContextStep;
    const isPrimaryActionDisabled = isSubmitting || !canContinueCurrentStep;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: AURORA.bg }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
        <ScrollView
            style={{ flex: 1, backgroundColor: AURORA.bg }}
            contentContainerStyle={{ paddingBottom: 120 }}
            scrollEnabled={isScrollEnabled}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            <View style={{ padding: 20, paddingTop: 24 }}>
                <Animatable.View animation="fadeInDown" duration={400} useNativeDriver style={{ marginBottom: 22 }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: AURORA.textPrimary, textAlign: 'center', marginBottom: 8 }}>
                        {isMoodStep && `Hey ${firstName}!`}
                        {isVitalityStep && 'Energy, stress, and sleep'}
                        {isContextStep && 'What affected your mood?'}
                    </Text>
                    <Text style={{ color: AURORA.textSec, textAlign: 'center', fontSize: 15 }}>
                        {isMoodStep && 'Choose how you feel right now, then set intensity.'}
                        {isVitalityStep && 'Sleep quality is required for each check-in.'}
                        {isContextStep && 'Optional tags for modern trend and correlation analysis.'}
                    </Text>
                </Animatable.View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 26 }}>
                    {['Mood', 'Vitals', 'Context'].map((label, idx) => {
                        const step = idx + 1;
                        const active = currentStep >= step;
                        return (
                            <View key={label} style={{ alignItems: 'center', flex: 1 }}>
                                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: active ? AURORA.blue : AURORA.cardAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                                    <Text style={{ color: active ? AURORA.textPrimary : AURORA.textMuted, fontWeight: '700' }}>{step}</Text>
                                </View>
                                <Text style={{ fontSize: 12, color: active ? AURORA.blue : '#9CB0DE' }}>{`${step} ${label}`}</Text>
                            </View>
                        );
                    })}
                </View>
                <View
                    style={{
                        height: 4,
                        borderRadius: 999,
                        backgroundColor: AURORA.cardAlt,
                        overflow: 'hidden',
                        marginBottom: 18,
                    }}
                >
                    <View
                        style={{
                            width: `${(currentStep / totalSteps) * 100}%`,
                            height: '100%',
                            backgroundColor: AURORA.blue,
                        }}
                    />
                </View>

                {isMoodStep && (
                    <View style={{ gap: 16 }}>
                        <View style={{ backgroundColor: AURORA.card, borderWidth: 1, borderColor: AURORA.border, borderRadius: 18, padding: 6 }}>
                            <View style={{ flexDirection: 'row', backgroundColor: AURORA.cardAlt, borderRadius: 12, padding: 4 }}>
                                <TouchableOpacity
                                    onPress={() => setMoodInputMode('manual')}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 10,
                                        borderRadius: 10,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: moodInputMode === 'manual' ? AURORA.blue : 'transparent',
                                    }}
                                >
                                    <Text style={{ color: moodInputMode === 'manual' ? AURORA.textPrimary : AURORA.textSec, fontWeight: '700' }}>
                                        Manual check-in
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setMoodInputMode('selfie')}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 10,
                                        borderRadius: 10,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: moodInputMode === 'selfie' ? AURORA.blue : 'transparent',
                                    }}
                                >
                                    <Text style={{ color: moodInputMode === 'selfie' ? AURORA.textPrimary : AURORA.textSec, fontWeight: '700' }}>
                                        Daily selfie
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 6, paddingBottom: 6 }}>
                                <Sparkles size={14} color={AURORA.amber} />
                                <Text style={{ color: AURORA.textMuted, fontSize: 12, flex: 1 }}>
                                    {moodInputMode === 'selfie'
                                        ? 'Daily selfie suggests mood from facial expression. You can use AI mood or retake before continuing.'
                                        : 'Manual mode gives full control when selecting your mood and intensity.'}
                                </Text>
                                {moodInputMode === 'selfie' ? (
                                    <TouchableOpacity
                                        onPress={showSelfiePrivacyGuide}
                                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                                    >
                                        <CircleHelp size={14} color={AURORA.textMuted} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                        {moodInputMode === 'selfie' ? (
                            <EmotionDetection
                                title="Daily Selfie (Expression-Based)"
                                helperText="Aurora estimates your mood from visible facial expression only. You can choose the analyzed mood and continue, or retake another selfie."
                                onEmotionDetected={(emotions) => {
                                    if (emotions.length > 0) {
                                        setSelectedEmotions([emotions[0]]);
                                    }
                                }}
                                onUseAnalyzedMood={applyAnalyzedMood}
                                saveActionLabel="Use this mood"
                                showSaveSuccessAlert={false}
                            />
                        ) : null}
                        {moodInputMode === 'manual' ? (
                            <>
                                <View style={{ backgroundColor: AURORA.card, borderWidth: 1, borderColor: AURORA.border, borderRadius: 18, padding: 16 }}>
                                    <Text style={{ color: AURORA.textPrimary, textAlign: 'center', fontWeight: '700', marginBottom: 14 }}>Select emotion</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                                        {MANUAL_EMOTIONS.map((emotion) => {
                                            const selected = selectedEmotions.some((x) => x.emotion === emotion.name);
                                            return (
                                                <TouchableOpacity
                                                    key={emotion.name}
                                                    onPress={() => {
                                                        triggerHaptic('light');
                                                        setSelectedEmotions([{ emotion: emotion.name, confidence: intensityTen / 10, color: emotion.color }]);
                                                        setDetectionMethod('manual');
                                                    }}
                                                    activeOpacity={0.85}
                                                    style={{
                                                        width: 72,
                                                        minHeight: 88,
                                                        borderRadius: 16,
                                                        borderWidth: selected ? 1.5 : 1,
                                                        borderColor: selected ? emotion.color : AURORA.border,
                                                        backgroundColor: selected ? `${emotion.color}24` : AURORA.cardAlt,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transform: [{ scale: selected ? 1.02 : 1 }],
                                                    }}
                                                >
                                                    {renderMoodVisual(emotion, 34)}
                                                    <Text style={{ marginTop: 5, fontSize: 12, color: selected ? emotion.color : AURORA.textSec, fontWeight: '700' }}>{emotion.label}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                                {selectedEmotions.length > 0 && (
                                    <View style={{ backgroundColor: AURORA.card, borderWidth: 1, borderColor: AURORA.border, borderRadius: 18, padding: 16 }}>
                                <View
                                    style={{
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 20,
                                        paddingVertical: 18,
                                        marginBottom: 12,
                                        backgroundColor: `${selectedManualEmotion.color}16`,
                                        borderWidth: 1.5,
                                        borderColor: `${selectedManualEmotion.color}55`,
                                    }}
                                >
                                    <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, floatingMoodStyle]}>
                                        {renderMoodVisual(selectedManualEmotion, 128)}
                                    </Animated.View>
                                    <Animated.View
                                        style={[
                                            {
                                                width: 84,
                                                height: 14,
                                                borderRadius: 999,
                                                backgroundColor: '#000',
                                                marginTop: 4,
                                                marginBottom: 6,
                                            },
                                            floatingShadowStyle,
                                        ]}
                                    />
                                    <Text style={{ color: selectedManualEmotion.color, fontWeight: '800', fontSize: 26 }}>
                                        {selectedManualEmotion.label}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <Zap size={16} color={selectedManualEmotion.color} />
                                    <Text style={{ color: AURORA.textPrimary, fontWeight: '700' }}>Intensity (1-10)</Text>
                                </View>
                                <SimpleSlider
                                    value={(intensityTen - 1) / 9}
                                    onValueChange={(val: number) => setIntensityTen(Math.max(1, Math.min(10, Math.round(1 + val * 9))))}
                                    minimumTrackTintColor={selectedManualEmotion.color}
                                    thumbTintColor={selectedManualEmotion.color}
                                    onSlidingStart={() => setIsScrollEnabled(false)}
                                    onSlidingComplete={() => setIsScrollEnabled(true)}
                                />
                                    </View>
                                )}
                            </>
                        ) : null}
                    </View>
                )}

                {isVitalityStep && (
                    <View style={{ backgroundColor: AURORA.card, borderWidth: 1, borderColor: AURORA.border, borderRadius: 18, padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Zap size={16} color={AURORA.amber} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={{ color: AURORA.textPrimary, fontWeight: '700' }}>Energy</Text>
                                <Text style={{ color: AURORA.textMuted, fontWeight: '500' }}>(1-5)</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => showScaleGuide('energy')}
                                style={{ padding: 4, marginLeft: 'auto' }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <CircleHelp size={16} color={AURORA.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <SimpleSlider
                            value={(energyLevel - 1) / 4}
                            onValueChange={(val: number) => setEnergyLevel(Math.max(1, Math.min(5, Math.round(1 + val * 4))))}
                            minimumTrackTintColor={AURORA.amber}
                            thumbTintColor={AURORA.amber}
                            onSlidingStart={() => setIsScrollEnabled(false)}
                            onSlidingComplete={() => setIsScrollEnabled(true)}
                        />
                        <Text style={{ color: AURORA.amber, marginBottom: 16, fontWeight: '700' }}>{energyLevel}</Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Heart size={16} color={AURORA.red} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={{ color: AURORA.textPrimary, fontWeight: '700' }}>Stress</Text>
                                <Text style={{ color: AURORA.textMuted, fontWeight: '500' }}>(1-5)</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => showScaleGuide('stress')}
                                style={{ padding: 4, marginLeft: 'auto' }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <CircleHelp size={16} color={AURORA.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <SimpleSlider
                            value={(stressLevel - 1) / 4}
                            onValueChange={(val: number) => setStressLevel(Math.max(1, Math.min(5, Math.round(1 + val * 4))))}
                            minimumTrackTintColor={AURORA.red}
                            thumbTintColor={AURORA.red}
                            onSlidingStart={() => setIsScrollEnabled(false)}
                            onSlidingComplete={() => setIsScrollEnabled(true)}
                        />
                        <Text style={{ color: AURORA.red, marginBottom: 16, fontWeight: '700' }}>{stressLevel}</Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <MoonStar size={16} color={AURORA.blue} />
                            <Text style={{ color: AURORA.textPrimary, fontWeight: '700' }}>
                                Sleep quality {sleepCapturedToday ? '(already set today)' : '(set once daily)'}
                            </Text>
                            <TouchableOpacity
                                onPress={showSleepGuide}
                                style={{ padding: 4, marginLeft: 'auto' }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <CircleHelp size={16} color={AURORA.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: AURORA.textMuted, fontSize: 12, marginBottom: 10 }}>
                            {sleepCapturedToday
                                ? 'You already logged sleep quality today. You can continue without changing it.'
                                : 'Set this once daily based on your main/night sleep (not naps).'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {(['poor', 'fair', 'good'] as SleepQuality[]).map((quality) => {
                                const selected = sleepQuality === quality;
                                return (
                                    <TouchableOpacity
                                        key={quality}
                                        onPress={() => setSleepQuality(quality)}
                                        style={{
                                            flex: 1,
                                            borderRadius: 12,
                                            paddingVertical: 12,
                                            borderWidth: 1,
                                            borderColor: selected ? AURORA.blue : AURORA.border,
                                            backgroundColor: selected ? 'rgba(45, 107, 255, 0.18)' : AURORA.cardAlt,
                                            opacity: sleepCapturedToday ? 0.75 : 1,
                                            alignItems: 'center',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            gap: 6,
                                        }}
                                        disabled={sleepCapturedToday}
                                    >
                                        <MoonStar size={14} color={selected ? AURORA.blue : AURORA.textSec} />
                                        <Text style={{ color: selected ? AURORA.blue : AURORA.textSec, fontWeight: '700' }}>
                                            {quality.charAt(0).toUpperCase() + quality.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {isContextStep && (
                    <View style={{ gap: 12 }}>
                        <View style={{ backgroundColor: AURORA.card, borderWidth: 1, borderColor: AURORA.border, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ color: AURORA.textSec }}>Academic signal</Text>
                            <Text style={{ color: AURORA.blue, fontWeight: '700' }}>{workloadBand}</Text>
                        </View>
                        {categoryConfigs.length === 0 ? (
                            <View style={{ backgroundColor: AURORA.card, borderWidth: 1, borderColor: AURORA.border, borderRadius: 14, padding: 14 }}>
                                <Text style={{ color: AURORA.textSec }}>No categories enabled. You can turn them on in Settings.</Text>
                            </View>
                        ) : (
                            categoryConfigs.map((category, idx) => (
                                <Animatable.View key={category.key} animation="fadeInUp" duration={320} delay={idx * 80} useNativeDriver style={{ backgroundColor: AURORA.card, borderWidth: 1, borderColor: AURORA.border, borderRadius: 14, padding: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        {category.icon}
                                        <View>
                                            <Text style={{ color: AURORA.textPrimary, fontWeight: '700' }}>{category.title}</Text>
                                            <Text style={{ color: AURORA.textMuted, fontSize: 12 }}>{category.helper}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {category.tags.map((tag) => {
                                            const selected = selectedTags.includes(tag);
                                            return (
                                                <TouchableOpacity
                                                    key={tag}
                                                    onPress={() => toggleTag(tag)}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 7,
                                                        borderRadius: 999,
                                                        borderWidth: 1,
                                                        borderColor: selected ? AURORA.blue : AURORA.border,
                                                        backgroundColor: selected ? 'rgba(45, 107, 255, 0.2)' : AURORA.cardAlt,
                                                    }}
                                                >
                                                    <Text style={{ color: selected ? AURORA.blue : AURORA.textSec, fontSize: 12, fontWeight: '700' }}>{tag}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </Animatable.View>
                            ))
                        )}
                        <View style={{ backgroundColor: AURORA.card, borderWidth: 1, borderColor: AURORA.border, borderRadius: 14, padding: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ color: AURORA.textPrimary, fontWeight: '700' }}>Journal (optional)</Text>
                                <Text style={{ color: AURORA.textMuted, fontSize: 11 }}>
                                    {journalEdited ? 'Edited' : 'Auto-draft'}
                                </Text>
                            </View>
                            <Text style={{ color: AURORA.textMuted, fontSize: 12, marginBottom: 10 }}>
                                {selectedTags.length > 0
                                    ? 'A short reflection is generated from your selected context tags. You can edit before saving.'
                                    : 'Select at least one context tag above to generate a quick journal draft.'}
                            </Text>
                            {selectedTags.length > 0 ? (
                                <>
                                    {!showJournalEditor ? (
                                        <>
                                            <View style={{ backgroundColor: AURORA.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: AURORA.border, padding: 10, marginBottom: 8 }}>
                                                <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 18 }}>
                                                    {journalText || buildJournalDraft()}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => setShowJournalEditor(true)}
                                                style={{
                                                    alignSelf: 'flex-start',
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 7,
                                                    borderRadius: 999,
                                                    borderWidth: 1,
                                                    borderColor: AURORA.blue,
                                                    backgroundColor: 'rgba(45, 107, 255, 0.18)',
                                                }}
                                            >
                                                <Text style={{ color: AURORA.blue, fontWeight: '700', fontSize: 12 }}>Edit draft</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            <TextInput
                                                value={journalText}
                                                onChangeText={(text) => {
                                                    setJournalText(text);
                                                    setJournalEdited(true);
                                                }}
                                                multiline
                                                placeholder="Write your reflection..."
                                                placeholderTextColor={AURORA.textMuted}
                                                style={{
                                                    minHeight: 94,
                                                    borderRadius: 10,
                                                    borderWidth: 1,
                                                    borderColor: AURORA.border,
                                                    backgroundColor: AURORA.cardAlt,
                                                    color: AURORA.textPrimary,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 10,
                                                    textAlignVertical: 'top',
                                                    marginBottom: 8,
                                                }}
                                            />
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setJournalEdited(false);
                                                        setJournalText(buildJournalDraft());
                                                    }}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 7,
                                                        borderRadius: 999,
                                                        borderWidth: 1,
                                                        borderColor: AURORA.border,
                                                        backgroundColor: AURORA.cardAlt,
                                                    }}
                                                >
                                                    <Text style={{ color: AURORA.textSec, fontSize: 12, fontWeight: '700' }}>Use auto draft</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => setShowJournalEditor(false)}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 7,
                                                        borderRadius: 999,
                                                        borderWidth: 1,
                                                        borderColor: AURORA.blue,
                                                        backgroundColor: 'rgba(45, 107, 255, 0.18)',
                                                    }}
                                                >
                                                    <Text style={{ color: AURORA.blue, fontSize: 12, fontWeight: '700' }}>Done editing</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    )}
                                </>
                            ) : null}
                        </View>
                    </View>
                )}
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {currentStep > 1 && (
                        <TouchableOpacity
                            onPress={() => setCurrentStep((c) => c - 1)}
                            style={{ flex: 1, backgroundColor: AURORA.card, borderWidth: 1, borderColor: AURORA.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                        >
                            <ArrowLeft size={16} color={AURORA.textSec} />
                            <Text style={{ color: AURORA.textSec, fontWeight: '700' }}>Back</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={currentStep === totalSteps ? handleSubmit : handleNext}
                        disabled={isPrimaryActionDisabled}
                        style={{
                            flex: 1,
                            backgroundColor: isPrimaryActionDisabled ? AURORA.textMuted : AURORA.blue,
                            borderRadius: 12,
                            paddingVertical: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 6,
                            opacity: isPrimaryActionDisabled ? 0.7 : 1,
                        }}
                    >
                        <Text style={{ color: AURORA.textPrimary, fontWeight: '700', opacity: isPrimaryActionDisabled ? 0.88 : 1 }}>
                            {isSubmitting ? 'Saving...' : currentStep === totalSteps ? 'Save check-in' : 'Continue'}
                        </Text>
                        {!isPrimaryActionDisabled && currentStep < totalSteps && <ArrowRight size={16} color={AURORA.textPrimary} />}
                        {!isPrimaryActionDisabled && currentStep === totalSteps && <Check size={16} color={AURORA.textPrimary} />}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
        </KeyboardAvoidingView>
    );
}
