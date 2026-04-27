import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, Animated, Switch, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { ArrowLeft, Search, Info, Wind, RotateCcw } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';
import { triggerHaptic } from '../../utils/haptics';
import {
    playAmbientSound,
    stopAmbientSound,
    pauseAmbientSound,
    resumeAmbientSound,
    type ResourceType,
} from '../../services/zen-sounds.service';

// ─── Mock Resource Data ───────────────────────────────────────────────────────
const MOCK_RESOURCES = [
    {
        id: '1', title: '5-Minute Calm', category: 'For Anxiety', duration: '10 min',
        type: 'Meditation', image: 'https://picsum.photos/seed/sunset-ocean/600/260',
    },
    {
        id: '2', title: 'Stress Release Scan', category: 'For Stress', duration: '15 min',
        type: 'Meditation', image: 'https://picsum.photos/seed/blue-mist/600/260',
    },
    {
        id: '3', title: 'Morning Focus', category: 'For Clarity', duration: '5 min',
        type: 'Focus', image: 'https://picsum.photos/seed/pine-forest/600/260',
    },
    {
        id: '4', title: 'Sleep Journey', category: 'For Rest', duration: '30 min',
        type: 'Sleep', image: 'https://picsum.photos/seed/night-stars/600/260',
    },
];

const CATEGORIES = ['All', 'Meditation', 'Focus', 'Sleep'];
const BREATHING_PHASES = [
    { name: 'Inhale', instruction: 'Deeply through your nose', duration: 4 },
    { name: 'Hold', instruction: 'Hold your breath gently', duration: 4 },
    { name: 'Exhale', instruction: 'Slowly through your mouth', duration: 6 },
];
const TOTAL_DURATION = 4 * 60 + 52; // 4 min 52 sec

// Ambient labels and icons per type
const AMBIENT_LABELS: Record<string, string> = {
    Meditation: 'Peaceful Calm',
    Focus: 'Rain & Focus',
    Sleep: 'Night Rest',
};
const AMBIENT_EMOJI: Record<string, string> = {
    Meditation: '🌊',
    Focus: '🌲',
    Sleep: '🌙',
};
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Resource Card ────────────────────────────────────────────────────────────
function ResourceCard({ item, onStart }: {
    item: typeof MOCK_RESOURCES[0];
    onStart: () => void;
}) {
    const level = item.duration.startsWith('5') || item.duration.startsWith('10') ? 'Beginner' : 'Intermediate';
    return (
        <View style={{
            backgroundColor: AURORA.card, borderRadius: 20,
            marginBottom: 18, overflow: 'hidden',
            borderWidth: 1, borderColor: AURORA.border,
        }}>
            <View style={{ position: 'relative' }}>
                <Image
                    source={{ uri: item.image }}
                    style={{ width: '100%', height: 162 }}
                    resizeMode="cover"
                />
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 52,
                        backgroundColor: 'rgba(7,11,42,0.32)',
                    }}
                />
            </View>
            <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 14, paddingVertical: 13, backgroundColor: 'rgba(14,18,56,0.95)',
                gap: 12,
            }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 5 }} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <View style={{
                            backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8,
                            paddingHorizontal: 8, paddingVertical: 3,
                        }}>
                            <Text style={{ color: AURORA.textSec, fontSize: 11, fontWeight: '600' }}>
                                {item.duration}
                            </Text>
                        </View>
                        <Text style={{ color: '#AFC0E8', fontSize: 12 }}>{item.category}</Text>
                        <View style={{
                            backgroundColor: 'rgba(139,92,246,0.22)',
                            borderRadius: 999,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                        }}>
                            <Text style={{ color: '#DCC8FF', fontSize: 11, fontWeight: '600' }}>{level}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => { triggerHaptic('light'); onStart(); }}
                    activeOpacity={0.8}
                    style={{
                        backgroundColor: AURORA.purple, borderRadius: 22,
                        minHeight: 42,
                        paddingHorizontal: 21, paddingVertical: 10,
                        justifyContent: 'center',
                    }}
                >
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Start</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Breathing Exercise View ──────────────────────────────────────────────────
function BreathingExerciseView({
    resource, onBack
}: {
    resource: typeof MOCK_RESOURCES[0] | null;
    onBack: () => void;
}) {
    const [isPlaying, setIsPlaying] = useState(true);
    const [phaseIdx, setPhaseIdx] = useState(0);
    const [phaseTime, setPhaseTime] = useState(0);
    const [totalTime, setTotalTime] = useState(TOTAL_DURATION);
    const [ambientOn, setAmbientOn] = useState(true);
    const resourceType = (resource?.type ?? 'Meditation') as ResourceType;
    const hasMountedPhaseRef = useRef(false);
    const phaseProgressAnim = useRef(new Animated.Value(0)).current;

    // Ambient sound: play when on, stop when off or unmount
    useEffect(() => {
        if (ambientOn && resource) {
            playAmbientSound(resourceType, resource.title);
        } else {
            stopAmbientSound();
        }
        return () => { stopAmbientSound(); };
    }, [ambientOn, resource?.id]);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const currentPhase = BREATHING_PHASES[phaseIdx];
    const phaseProgress = currentPhase.duration > 0 ? Math.min(phaseTime / currentPhase.duration, 1) : 0;
    const progressRadius = 86;
    const progressCircumference = 2 * Math.PI * progressRadius;
    const progressOffset = phaseProgressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [progressCircumference, 0],
    });

    // Pulse animation
    useEffect(() => {
        if (!isPlaying) { pulseAnim.stopAnimation(); return; }
        const pulseDuration = currentPhase.duration * 1000;
        const toValue = phaseIdx === 0 ? 1.15 : phaseIdx === 2 ? 0.88 : 1;
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue, duration: pulseDuration / 2, useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1, duration: pulseDuration / 2, useNativeDriver: true,
            }),
        ]).start();
    }, [phaseIdx, isPlaying]);

    // Timer
    useEffect(() => {
        if (!isPlaying) return;
        intervalRef.current = setInterval(() => {
            setPhaseTime(prev => {
                if (prev + 1 >= currentPhase.duration) {
                    setPhaseIdx(i => (i + 1) % BREATHING_PHASES.length);
                    return 0;
                }
                return prev + 1;
            });
            setTotalTime(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isPlaying, phaseIdx]);

    // Gentle haptic cue when phase changes.
    useEffect(() => {
        if (!hasMountedPhaseRef.current) {
            hasMountedPhaseRef.current = true;
            return;
        }
        triggerHaptic('light');
    }, [phaseIdx]);

    // Smoothly animate ring progress through each phase.
    useEffect(() => {
        const duration = currentPhase.duration || 1;
        const clampedProgress = Math.min(Math.max(phaseProgress, 0), 1);
        const remainingMs = Math.max(0, (1 - clampedProgress) * duration * 1000);

        phaseProgressAnim.stopAnimation();
        phaseProgressAnim.setValue(clampedProgress);

        if (!isPlaying || remainingMs <= 0) return;

        Animated.timing(phaseProgressAnim, {
            toValue: 1,
            duration: remainingMs,
            easing: Easing.linear,
            useNativeDriver: false,
        }).start();
    }, [phaseIdx, isPlaying]);

    const reset = () => {
        setIsPlaying(false);
        setPhaseIdx(0); setPhaseTime(0); setTotalTime(TOTAL_DURATION);
        if (ambientOn && resource) {
            stopAmbientSound();
            playAmbientSound(resourceType, resource.title);
        }
        setTimeout(() => setIsPlaying(true), 100);
    };

    const minutes = Math.floor(totalTime / 60).toString().padStart(2, '0');
    const seconds = (totalTime % 60).toString().padStart(2, '0');

    return (
        <View style={{ flex: 1, backgroundColor: '#070B2A' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingVertical: 12,
                }}>
                    <TouchableOpacity
                        onPress={() => { triggerHaptic('light'); onBack(); }}
                        style={{ padding: 6 }}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                        <ArrowLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Breathing Space</Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 11, letterSpacing: 1.5 }}>AURORA MINDFULNESS</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => triggerHaptic('light')}
                        style={{ padding: 6 }}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                        <Info size={22} color={AURORA.textSec} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                    {/* Timer */}
                    <Text style={{ color: AURORA.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 8 }}>
                        Session remaining
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 30 }}>
                        {[{ label: 'MINUTES', val: minutes }, { label: 'SECONDS', val: seconds }].map(t => (
                            <View key={t.label} style={{
                                flex: 1, backgroundColor: 'rgba(45,107,255,0.15)',
                                borderRadius: 16, padding: 16, alignItems: 'center',
                                borderWidth: 1, borderColor: 'rgba(45,107,255,0.3)',
                            }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
                                    {t.val}
                                </Text>
                                <Text style={{ color: AURORA.textSec, fontSize: 11, letterSpacing: 1, marginTop: 2 }}>
                                    {t.label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Breathing Circle */}
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        {/* Outer glow ring */}
                        <View style={{
                            width: 220, height: 220, borderRadius: 110,
                            backgroundColor: 'rgba(45,107,255,0.08)',
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: 1, borderColor: 'rgba(45,107,255,0.15)',
                        }}>
                            <View style={{
                                width: 180, height: 180, borderRadius: 90,
                                backgroundColor: 'rgba(45,107,255,0.1)',
                                alignItems: 'center', justifyContent: 'center',
                                borderWidth: 1, borderColor: 'rgba(45,107,255,0.2)',
                            }}>
                                <Svg
                                    width={188}
                                    height={188}
                                    style={{ position: 'absolute' }}
                                >
                                    <Circle
                                        cx={94}
                                        cy={94}
                                        r={progressRadius}
                                        stroke="rgba(45,107,255,0.22)"
                                        strokeWidth={4}
                                        fill="none"
                                    />
                                    <AnimatedCircle
                                        cx={94}
                                        cy={94}
                                        r={progressRadius}
                                        stroke="#6FA1FF"
                                        strokeWidth={4}
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeDasharray={`${progressCircumference} ${progressCircumference}`}
                                        strokeDashoffset={progressOffset}
                                        rotation={-90}
                                        origin="94, 94"
                                    />
                                </Svg>
                                <Animated.View style={{
                                    width: 140, height: 140, borderRadius: 70,
                                    backgroundColor: '#3D7BFF',
                                    alignItems: 'center', justifyContent: 'center',
                                    transform: [{ scale: pulseAnim }],
                                    shadowColor: '#2D6BFF', shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.8, shadowRadius: 30, elevation: 12,
                                }}>
                                    <Wind size={40} color="#FFFFFF" />
                                </Animated.View>
                            </View>
                        </View>
                        {/* Phase dot indicator */}
                        <View style={{ marginTop: 8 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' }} />
                        </View>
                    </View>

                    {/* Phase text */}
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '800', marginBottom: 8 }}>
                            {currentPhase.name}
                        </Text>
                        <Text style={{ color: '#AFC0E8', fontSize: 14 }}>{currentPhase.instruction}</Text>
                    </View>

                    {/* Phase Tabs */}
                    <View style={{
                        flexDirection: 'row', backgroundColor: AURORA.card,
                        borderRadius: 16, padding: 4, marginBottom: 20,
                        borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        {BREATHING_PHASES.map((p, i) => (
                            <TouchableOpacity
                                key={p.name}
                                onPress={() => { triggerHaptic('light'); setPhaseIdx(i); setPhaseTime(0); }}
                                style={{
                                    flex: 1, paddingVertical: 10, borderRadius: 12,
                                    alignItems: 'center',
                                    backgroundColor: phaseIdx === i ? AURORA.blue : 'transparent',
                                }}
                            >
                                <Text style={{
                                    color: phaseIdx === i ? '#FFFFFF' : AURORA.textSec,
                                    fontWeight: phaseIdx === i ? '700' : '400', fontSize: 13,
                                }}>
                                    {p.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Ambient Sound Card */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => {
                            triggerHaptic('light');
                            setAmbientOn(v => !v);
                        }}
                        style={{
                        backgroundColor: AURORA.card, borderRadius: 18,
                        padding: 14, flexDirection: 'row', alignItems: 'center',
                        marginBottom: 20, borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        <View style={{
                            width: 42, height: 42, borderRadius: 10,
                            backgroundColor: 'rgba(45,107,255,0.2)',
                            alignItems: 'center', justifyContent: 'center', marginRight: 12,
                        }}>
                            <Text style={{ fontSize: 20 }}>{AMBIENT_EMOJI[resourceType] ?? '🌲'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                                {AMBIENT_LABELS[resourceType] ?? 'Peaceful Forest'}
                            </Text>
                            <Text style={{ color: AURORA.textSec, fontSize: 12 }}>
                                {ambientOn ? 'Ambient sound active' : 'Ambient sound off'}
                            </Text>
                        </View>
                        <Switch
                            value={ambientOn}
                            onValueChange={(v) => { triggerHaptic('light'); setAmbientOn(v); }}
                            trackColor={{ false: AURORA.cardAlt, true: AURORA.blue }}
                            thumbColor="#FFFFFF"
                        />
                    </TouchableOpacity>
                </ScrollView>

                {/* Persistent controls */}
                <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => {
                                triggerHaptic('light');
                                setIsPlaying(p => {
                                    if (ambientOn) {
                                        if (p) pauseAmbientSound(); else resumeAmbientSound();
                                    }
                                    return !p;
                                });
                            }}
                            style={{
                                flex: 1, backgroundColor: AURORA.blue,
                                borderRadius: 20, paddingVertical: 16,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
                                {isPlaying ? 'Pause' : 'Resume'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { triggerHaptic('light'); reset(); }}
                            style={{
                                width: 60, backgroundColor: AURORA.card,
                                borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                                borderWidth: 1, borderColor: AURORA.border,
                            }}
                        >
                            <RotateCcw size={22} color={AURORA.textSec} />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ResourcesScreen() {
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeResource, setActiveResource] = useState<typeof MOCK_RESOURCES[0] | null>(null);

    if (activeResource) {
        return <BreathingExerciseView resource={activeResource} onBack={() => setActiveResource(null)} />;
    }

    const filteredResources = activeCategory === 'All'
        ? MOCK_RESOURCES
        : MOCK_RESOURCES.filter(r => r.type === activeCategory);

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgResources }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ─────────────────────────────────────────────────── */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
                }}>
                    <View>
                        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>Aurora Library</Text>
                        <Text style={{ color: '#9C85D9', fontSize: 11, fontWeight: '700', letterSpacing: 0.45 }}>
                            MSU-IIT CCS
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => triggerHaptic('light')} style={{ padding: 7 }}>
                        <Search size={22} color={AURORA.textSec} />
                    </TouchableOpacity>
                </View>

                {/* ── Category Tabs ─────────────────────────────────────────── */}
                <View style={{
                    flexDirection: 'row', paddingHorizontal: 20,
                    borderBottomWidth: 1, borderBottomColor: AURORA.border,
                    marginTop: 4,
                }}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => { triggerHaptic('light'); setActiveCategory(cat); }}
                            hitSlop={{ top: 8, left: 6, right: 6, bottom: 8 }}
                            style={{
                                minHeight: 42,
                                justifyContent: 'center',
                                paddingVertical: 8, paddingHorizontal: 4, marginRight: 16,
                                borderBottomWidth: 2,
                                borderBottomColor: activeCategory === cat ? AURORA.blue : 'transparent',
                            }}
                        >
                            <Text style={{
                                color: activeCategory === cat ? AURORA.blue : '#9FB0D4',
                                fontSize: 14, fontWeight: activeCategory === cat ? '700' : '400',
                            }}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Resource Cards ─────────────────────────────────────────── */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 110 }}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 16 }}>
                        Curated for You
                    </Text>
                    {filteredResources.map(item => (
                        <ResourceCard
                            key={item.id}
                            item={item}
                            onStart={() => setActiveResource(item)}
                        />
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
