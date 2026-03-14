import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, Animated, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

// ─── Resource Card ────────────────────────────────────────────────────────────
function ResourceCard({ item, onStart }: {
    item: typeof MOCK_RESOURCES[0];
    onStart: () => void;
}) {
    return (
        <View style={{
            backgroundColor: AURORA.card, borderRadius: 20,
            marginBottom: 16, overflow: 'hidden',
            borderWidth: 1, borderColor: AURORA.border,
        }}>
            <Image
                source={{ uri: item.image }}
                style={{ width: '100%', height: 160 }}
                resizeMode="cover"
            />
            <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                padding: 14, backgroundColor: 'rgba(14,18,56,0.95)',
            }}>
                <View>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 4 }}>
                        {item.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{
                            backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8,
                            paddingHorizontal: 8, paddingVertical: 3,
                        }}>
                            <Text style={{ color: AURORA.textSec, fontSize: 11, fontWeight: '600' }}>
                                {item.duration}
                            </Text>
                        </View>
                        <Text style={{ color: AURORA.textSec, fontSize: 12 }}>{item.category}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => { triggerHaptic('light'); onStart(); }}
                    activeOpacity={0.8}
                    style={{
                        backgroundColor: AURORA.purple, borderRadius: 24,
                        paddingHorizontal: 22, paddingVertical: 10,
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
                    <TouchableOpacity onPress={() => { triggerHaptic('light'); onBack(); }} style={{ padding: 4 }}>
                        <ArrowLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Breathing Space</Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 11, letterSpacing: 1.5 }}>AURORA MINDFULNESS</Text>
                    </View>
                    <TouchableOpacity onPress={() => triggerHaptic('light')} style={{ padding: 4 }}>
                        <Info size={22} color={AURORA.textSec} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
                    {/* Timer */}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 32 }}>
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
                        <Text style={{ color: AURORA.textSec, fontSize: 14 }}>{currentPhase.instruction}</Text>
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
                    <View style={{
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
                    </View>

                    {/* Controls */}
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
                                borderRadius: 20, paddingVertical: 18,
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
                </ScrollView>
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
                        <Text style={{ color: AURORA.purple, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
                            MSU-IIT CCS
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => triggerHaptic('light')} style={{ padding: 4 }}>
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
                            style={{
                                paddingVertical: 10, marginRight: 18,
                                borderBottomWidth: 2,
                                borderBottomColor: activeCategory === cat ? AURORA.blue : 'transparent',
                            }}
                        >
                            <Text style={{
                                color: activeCategory === cat ? AURORA.blue : AURORA.textSec,
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
                    contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 14 }}>
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
