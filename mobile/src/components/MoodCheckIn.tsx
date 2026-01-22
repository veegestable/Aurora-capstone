import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Platform, Image, PanResponder } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { EmotionDetection } from './EmotionDetection';
import { moodService } from '../services/mood.service';
import { useAuth } from '../stores/AuthContext';
import { Sparkles, MousePointerClick, Zap, Frown, Target, ClipboardList, ArrowLeft } from 'lucide-react-native';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { useRouter } from 'expo-router';


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
            <View pointerEvents="none" style={{ height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 }}>
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
                borderColor: 'white'
            }} />
        </View>
    );
};

const MANUAL_EMOTIONS = [
    { name: 'joy', color: '#FFD700', label: 'Happy', image: require('../assets/happy.png') },
    { name: 'sadness', color: '#4169E1', label: 'Sad', image: require('../assets/sad.png') },
    { name: 'anger', color: '#DC143C', label: 'Angry', image: require('../assets/angry.png') },
    { name: 'surprise', color: '#FF8C00', label: 'Surprise', image: require('../assets/surprise.png') },
    { name: 'neutral', color: '#808080', label: 'Neutral', image: require('../assets/neutral.png') }
];

type CheckInMode = 'manual' | 'camera';

export function MoodCheckIn() {
    const router = useRouter();
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
        setSelectedEmotions(emotions);
        setIsManualMode(false);
    };

    const handleManualEmotionToggle = (emotion: typeof MANUAL_EMOTIONS[0]) => {
        const existing = selectedEmotions.find(e => e.emotion === emotion.name);
        if (existing) {
            setSelectedEmotions(prev => prev.filter(e => e.emotion !== emotion.name));
        } else {
            setSelectedEmotions(prev => [...prev, {
                emotion: emotion.name,
                confidence: 0.7,
                color: emotion.color
            }]);
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
                    { text: 'Yes, please', onPress: () => router.push('/dashboard/schedule') }
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
        <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <Text className="text-gray-700 font-medium text-base">{label}</Text>
            <View className="flex-row items-center gap-4">
                <TouchableOpacity
                    onPress={() => onChange(Math.max(0, value - 1))}
                    className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center active:bg-gray-200"
                >
                    <Text className="text-xl font-bold text-gray-600">-</Text>
                </TouchableOpacity>
                <Text className="text-xl font-bold w-6 text-center">{value}</Text>
                <TouchableOpacity
                    onPress={() => onChange(value + 1)}
                    className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center border border-blue-100 active:bg-blue-100"
                >
                    <Text className="text-xl font-bold text-blue-600">+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const StepIndicator = () => (
        <View className="flex-row items-center mb-8 px-4 w-full">
            {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                    <View className={`w-8 h-8 rounded-full items-center justify-center ${currentStep >= step ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <Text className="text-white font-bold">{step}</Text>
                    </View>
                    {step < 3 && <View className={`h-1 flex-1 mx-2 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                </React.Fragment>
            ))}
        </View>
    );

    if (isSubmitted) {
        const moodMessage = getMoodMessage();
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center p-6">
                <View className="bg-white p-8 rounded-3xl shadow-lg w-full items-center space-y-6">
                    <View className={`p-6 rounded-full ${moodMessage.isPositive ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                        {moodMessage.isPositive ?
                            <Sparkles size={48} color="#EAB308" /> :
                            <Ionicons name="leaf-outline" size={48} color="#3B82F6" />
                        }
                    </View>

                    <View className="space-y-2 text-center items-center">
                        <Text className="text-2xl font-bold text-gray-900 text-center">{moodMessage.title}</Text>
                        <Text className="text-gray-600 text-center text-lg leading-6">{moodMessage.message}</Text>
                    </View>

                    <View className="w-full space-y-3 pt-4">
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full"
                            onPress={() => router.replace('/dashboard/calendar')}
                        >
                            Back to Dashboard
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full"
                            onPress={() => setIsSubmitted(false)}
                        >
                            Edit Log
                        </Button>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        >
            <View className="p-4 pt-8">
                <Text className="text-2xl font-bold text-gray-900 text-center mb-1">
                    {currentStep === 1 && `Hey ${user?.full_name ? user.full_name.split(' ')[0] : 'there'}, How are you feeling today?`}
                    {currentStep === 2 && "What's affecting you?"}
                    {currentStep === 3 && "Any final thoughts?"}
                </Text>
                <Text className="text-gray-500 text-center mb-6">Step {currentStep} of {totalSteps}</Text>

                <StepIndicator />

                {/* STEP 1: MOOD & INTENSITY */}
                {currentStep === 1 && (
                    <View className="space-y-6">

                        {/* SAFE TOGGLE: Maintained from crash-fix version */}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', backgroundColor: '#e5e7eb', borderRadius: 9999, padding: 4, alignSelf: 'center', marginBottom: 24 }}>
                            <TouchableOpacity
                                onPress={() => setIsManualMode(false)}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999, backgroundColor: !isManualMode ? 'white' : 'transparent' }}
                            >
                                <Ionicons name="sparkles" size={18} color={!isManualMode ? '#3B82F6' : '#6B7280'} />
                                <Text style={{ marginLeft: 8, fontWeight: '600', color: !isManualMode ? '#2563EB' : '#6B7280' }}>AI Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setIsManualMode(true)}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999, backgroundColor: isManualMode ? 'white' : 'transparent' }}
                            >
                                <Ionicons name="hand-left" size={18} color={isManualMode ? '#3B82F6' : '#6B7280'} />
                                <Text style={{ marginLeft: 8, fontWeight: '600', color: isManualMode ? '#2563EB' : '#6B7280' }}>Manual Pick</Text>
                            </TouchableOpacity>
                        </View>

                        {!isManualMode ? (
                            <EmotionDetection onEmotionDetected={handleAIEmotionDetected} />
                        ) : (
                            <View className="flex-row flex-wrap justify-center gap-4 px-2">
                                {MANUAL_EMOTIONS.map(emotion => {
                                    const isSelected = selectedEmotions.some(e => e.emotion === emotion.name);
                                    return (
                                        <TouchableOpacity
                                            key={emotion.name}
                                            onPress={() => handleManualEmotionToggle(emotion)}
                                            className={`items-center justify-center w-24 h-24 rounded-2xl ${isSelected ? 'border-2 border-blue-500 bg-blue-50' : 'bg-white border border-gray-100 shadow-sm'}`}
                                        >
                                            <Image
                                                source={emotion.image}
                                                style={{ width: 48, height: 48 }}
                                                resizeMode="contain"
                                                className="mb-2"
                                            />
                                            <Text className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>{emotion.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {selectedEmotions.length > 0 && (
                            <Card className="p-4 bg-white/80 mt-6">
                                <Text className="font-semibold mb-4 text-gray-700">Intensity</Text>
                                {selectedEmotions.map((emotion, index) => (
                                    <View key={index} className="mb-2">
                                        <View className="flex-row justify-between mb-2">
                                            <Text className="capitalize font-medium text-blue-900">{emotion.emotion}</Text>
                                            <Text className="text-blue-700 font-bold">{Math.round(emotion.confidence * 100)}%</Text>
                                        </View>
                                        <SimpleSlider
                                            value={emotion.confidence}
                                            onValueChange={(val: number) => {
                                                const newEmotions = [...selectedEmotions];
                                                newEmotions[index].confidence = val;
                                                setSelectedEmotions(newEmotions);
                                            }}
                                            minimumTrackTintColor={emotion.color || '#3B82F6'}
                                            thumbTintColor={emotion.color || '#3B82F6'}
                                            onSlidingStart={() => setIsScrollEnabled(false)}
                                            onSlidingComplete={() => setIsScrollEnabled(true)}
                                        />
                                    </View>
                                ))}
                            </Card>
                        )}
                    </View>
                )}

                {/* STEP 2: CONTEXT (Academic, Sleep, Energy, Stress) */}
                {currentStep === 2 && (
                    <View className="space-y-6">
                        {/* Selected Emotion Summary */}
                        <View className="flex-row items-center justify-center mb-2">
                            <Text className="text-gray-500 mr-2">Feeling</Text>
                            <View className="flex-row items-center bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selectedEmotion?.color, marginRight: 6 }} />
                                <Text className="font-bold text-blue-800 capitalize">{selectedEmotion?.emotion}</Text>
                            </View>
                        </View>

                        {/* Energy Level */}
                        <Card className="p-5">
                            <View className="flex-row items-center gap-2 mb-4">
                                <ClipboardList size={20} color="#4B5563" />
                                <Text className="font-bold text-lg text-gray-800">Academic Load</Text>
                            </View>
                            <Counter label="Classes Today" value={classesCount} onChange={setClassesCount} />
                            <Counter label="Upcoming Exams" value={examsCount} onChange={setExamsCount} />
                            <Counter label="Deadlines" value={deadlinesCount} onChange={setDeadlinesCount} />
                        </Card>

                        {/* Stress Level */}
                        <Card className="p-5">
                            <View className="flex-row items-center gap-2 mb-4">
                                <Zap size={20} color="#EAB308" />
                                <Text className="font-bold text-lg text-gray-800">Vitality</Text>
                            </View>

                            <Text className="text-gray-600 font-medium mb-3">Sleep Quality</Text>
                            <View className="flex-row gap-3 mb-6">
                                {['poor', 'fair', 'good'].map((quality, index) => {
                                    const value = index + 1; // 1, 2, 3
                                    return (
                                        <TouchableOpacity
                                            key={quality}
                                            onPress={() => setSleepQuality(value)}
                                            className={`flex-1 py-3 rounded-xl border-2 items-center ${sleepQuality === value
                                                ? 'bg-indigo-50 border-indigo-500'
                                                : 'bg-white border-gray-100'
                                                }`}
                                        >
                                            <Text className={`font-bold capitalize ${sleepQuality === value ? 'text-indigo-700' : 'text-gray-400'
                                                }`}>
                                                {quality}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <View className="mb-4">
                                <View className="flex-row justify-between mb-2">
                                    <Text className="font-medium text-gray-600">Energy Level</Text>
                                    <Text className="font-bold text-amber-600">{energyLevel}/10</Text>
                                </View>
                                <SimpleSlider
                                    value={energyLevel / 10}
                                    onValueChange={(val: number) => setEnergyLevel(Math.max(1, Math.round(val * 10)))}
                                    minimumTrackTintColor="#EAB308"
                                    thumbTintColor="#EAB308"
                                    onSlidingStart={() => setIsScrollEnabled(false)}
                                    onSlidingComplete={() => setIsScrollEnabled(true)}
                                />
                            </View>

                            <View>
                                <View className="flex-row justify-between mb-2">
                                    <Text className="font-medium text-gray-600">Stress Level</Text>
                                    <Text className="font-bold text-red-500">{stressLevel}/10</Text>
                                </View>
                                <SimpleSlider
                                    value={stressLevel / 10}
                                    onValueChange={(val: number) => setStressLevel(Math.max(1, Math.round(val * 10)))}
                                    minimumTrackTintColor="#EF4444"
                                    thumbTintColor="#EF4444"
                                    onSlidingStart={() => setIsScrollEnabled(false)}
                                    onSlidingComplete={() => setIsScrollEnabled(true)}
                                />
                                <View className="flex-row justify-between mt-3">
                                    <Text className="text-xs text-gray-400 font-medium">Very Relaxed</Text>
                                    <Text className="text-xs text-gray-400 font-medium">Overwhelmed</Text>
                                </View>
                            </View>
                        </Card>
                    </View>
                )}

                {/* STEP 3: JOURNAL & SUBMIT */}
                {currentStep === 3 && (
                    <View className="space-y-6">
                        <Card className="p-5">
                            <Text className="font-bold text-lg text-gray-800 mb-4">Journal (Optional)</Text>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-xl p-4 text-gray-700 text-base leading-6 h-40"
                                placeholder="Write about what triggered these emotions..."
                                placeholderTextColor="#9CA3AF"
                                textAlignVertical="top"
                                multiline
                                value={notes}
                                onChangeText={setNotes}
                                numberOfLines={6}
                            />
                        </Card>

                        <View className="bg-blue-50 p-4 rounded-xl flex-row items-center gap-3">
                            <View className="bg-blue-100 p-2 rounded-full">
                                <Sparkles size={20} color="#2563EB" />
                            </View>
                            <Text className="flex-1 text-blue-800 text-sm">
                                "Awareness is the first step to change." Great job on checking in today!
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* NAVIGATION BUTTONS */}
            <View className="flex-row gap-4 mt-8 mb-10 px-4">
                {currentStep > 1 && (
                    <TouchableOpacity
                        onPress={handleBack}
                        className="flex-1 bg-white border border-gray-300 py-4 rounded-xl items-center"
                    >
                        <ArrowLeft size={20} color="#4B5563" className="mr-2" />
                        <Text className="font-bold text-gray-700">Back</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={currentStep === totalSteps ? handleSubmit : handleNext}
                    disabled={isSubmitting}
                    className={`flex-1 py-4 rounded-xl items-center shadow-md ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600'
                        }`}
                >
                    {isSubmitting ? (
                        <Text className="font-bold text-white">Saving...</Text>
                    ) : (
                        <Text className="font-bold text-white text-lg">
                            {currentStep === totalSteps ? 'Complete Check-In' : 'Next'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

        </ScrollView >
    );
}
