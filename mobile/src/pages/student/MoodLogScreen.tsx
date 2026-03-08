import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    Modal, Platform, Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, TrendingUp, Lightbulb, Camera, MessageSquare, BookOpen, X } from 'lucide-react-native';
import { useAuth } from '../../stores/AuthContext';
import { router } from 'expo-router';
import { moodService } from '../../services/mood.service';
import { AURORA } from '../../constants/aurora-colors';
import { MoodCheckIn } from '../../components/MoodCheckIn';

// ─── Mood Emotion Data ──────────────────────────────────────────────────────
const MOOD_EMOTIONS = [
    { name: 'joy', label: 'Happy', color: AURORA.moodHappy, image: require('../../assets/happy.png') },
    { name: 'sadness', label: 'Sad', color: AURORA.moodSad, image: require('../../assets/sad.png') },
    { name: 'neutral', label: 'Neutral', color: AURORA.moodNeutral, image: require('../../assets/neutral.png') },
    { name: 'surprise', label: 'Surprise', color: AURORA.moodSurprise, image: require('../../assets/surprise.png') },
    { name: 'anger', label: 'Angry', color: AURORA.moodAngry, image: require('../../assets/angry.png') },
];

// ─── Mood Bubble ─────────────────────────────────────────────────────────────
function MoodBubble({ mood, selected, onPress }: {
    mood: typeof MOOD_EMOTIONS[0];
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ alignItems: 'center', gap: 6 }}>
            <View style={{
                width: 58, height: 58, borderRadius: 29,
                backgroundColor: mood.color,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: selected ? 3 : 0,
                borderColor: '#FFFFFF',
                shadowColor: mood.color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: selected ? 0.7 : 0,
                shadowRadius: 10,
                elevation: selected ? 8 : 0,
            }}>
                <Image source={mood.image} style={{ width: 36, height: 36 }} resizeMode="contain" />
            </View>
            <Text style={{ color: selected ? '#FFFFFF' : AURORA.textSec, fontSize: 11, fontWeight: selected ? '700' : '400' }}>
                {mood.label}
            </Text>
        </TouchableOpacity>
    );
}

// ─── Quick Action Tile ────────────────────────────────────────────────────────
function QuickActionTile({
    label, icon, bgColor, wide, badge, onPress
}: {
    label: string; icon: React.ReactNode; bgColor: string; wide?: boolean; badge?: React.ReactNode; onPress?: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            style={{
                flex: wide ? 2 : 1,
                backgroundColor: AURORA.card,
                borderRadius: 18,
                padding: 16,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 84,
                borderWidth: 1,
                borderColor: AURORA.border,
                position: 'relative',
            }}
        >
            <View style={{ backgroundColor: bgColor, borderRadius: 12, padding: 10, marginBottom: 4 }}>
                {icon}
            </View>
            {badge && (
                <View style={{ position: 'absolute', top: 10, right: 10 }}>{badge}</View>
            )}
            <Text style={{ color: AURORA.textSec, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textAlign: 'center' }}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

// ─── Streak Card ──────────────────────────────────────────────────────────────
function StreakCard({ streak }: { streak: number }) {
    return (
        <View style={{
            flex: 1, backgroundColor: AURORA.card, borderRadius: 18,
            padding: 16, borderWidth: 1, borderColor: AURORA.border,
        }}>
            <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
                STREAK
            </Text>
            <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: 'rgba(249,115,22,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
            }}>
                <Text style={{ fontSize: 22 }}>🔥</Text>
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800', lineHeight: 30 }}>
                {streak}
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Days</Text>
            <Text style={{ color: AURORA.textSec, fontSize: 11, marginTop: 4 }}>Daily check-in goal met!</Text>
        </View>
    );
}

// ─── Trend Card ──────────────────────────────────────────────────────────────
function TrendCard({ topEmotion }: { topEmotion: string }) {
    return (
        <View style={{
            flex: 1, backgroundColor: AURORA.card, borderRadius: 18,
            padding: 16, borderWidth: 1, borderColor: AURORA.border,
        }}>
            <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
                TREND
            </Text>
            <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: 'rgba(45,107,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
            }}>
                <TrendingUp size={22} color={AURORA.blue} />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', lineHeight: 22 }}>
                STABLE
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', lineHeight: 22 }}>
                {topEmotion.toUpperCase() || 'HAPPY'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
                <Text style={{ color: AURORA.amber, fontSize: 11 }}>✦</Text>
                <Text style={{ color: AURORA.amber, fontSize: 12, fontWeight: '600' }}>Consistency</Text>
            </View>
        </View>
    );
}

// ─── AI Insight Card ─────────────────────────────────────────────────────────
function AIInsightCard({ insight }: { insight: string }) {
    return (
        <View style={{
            backgroundColor: AURORA.card, borderRadius: 18,
            padding: 16, flexDirection: 'row', alignItems: 'flex-start',
            gap: 12, borderWidth: 1, borderColor: AURORA.border,
        }}>
            <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: 'rgba(124,58,237,0.25)',
                alignItems: 'center', justifyContent: 'center',
            }}>
                <Lightbulb size={22} color={AURORA.purple} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 4 }}>AI Insight</Text>
                <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 19 }}>{insight}</Text>
            </View>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MoodLogScreen() {
    const { user } = useAuth();
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [showLogModal, setShowLogModal] = useState(false);
    const [stats, setStats] = useState({ streak: 7, topEmotion: 'happy' });
    const [insight, setInsight] = useState(
        'Your mood has been simplified for better tracking. Use the camera icon to analyze micro-emotions instantly.'
    );

    const firstName = user?.full_name?.split(' ')[0] || 'Student';

    useEffect(() => {
        loadStats();
    }, [user]);

    const loadStats = async () => {
        if (!user) return;
        try {
            const end = new Date();
            const start = new Date(); start.setDate(start.getDate() - 30);
            const logs = await moodService.getMoodLogs(user.id, start.toISOString(), end.toISOString());
            if (logs && logs.length > 0) {
                const emotionCounts: Record<string, number> = {};
                logs.forEach((log: any) => {
                    log.emotions?.forEach((e: any) => {
                        emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
                    });
                });
                let topEmotion = 'happy';
                let max = 0;
                Object.entries(emotionCounts).forEach(([e, c]) => { if (c > max) { max = c; topEmotion = e; } });
                const insights = moodService.generateInsights(logs);
                setStats({ streak: Math.min(logs.length, 7), topEmotion });
                if (insights?.[0]) setInsight(insights[0]);
            }
        } catch { /* use defaults */ }
    };

    const handleMoodTap = (moodName: string) => {
        setSelectedMood(moodName === selectedMood ? null : moodName);
        setShowLogModal(true);
    };

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Header ─────────────────────────────────────────────── */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{
                                width: 44, height: 44, borderRadius: 22,
                                backgroundColor: AURORA.card, borderWidth: 2, borderColor: AURORA.blue,
                                alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                            }}>
                                {user?.avatar_url ? (
                                    <Image source={{ uri: user.avatar_url }} style={{ width: 44, height: 44 }} resizeMode="cover" />
                                ) : (
                                    <Text style={{ color: AURORA.blue, fontWeight: '700', fontSize: 16 }}>
                                        {firstName.charAt(0).toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <View>
                                <Text style={{ color: AURORA.textSec, fontSize: 12, letterSpacing: 1 }}>WELCOME BACK</Text>
                                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{user?.preferred_name || user?.full_name || 'Student'}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={{
                            width: 44, height: 44, borderRadius: 22,
                            backgroundColor: AURORA.card, alignItems: 'center', justifyContent: 'center',
                            borderWidth: 1, borderColor: AURORA.border,
                        }}>
                            <Bell size={20} color={AURORA.textSec} />
                            <View style={{
                                position: 'absolute', top: 8, right: 8,
                                width: 8, height: 8, borderRadius: 4,
                                backgroundColor: AURORA.red, borderWidth: 1.5, borderColor: AURORA.bg,
                            }} />
                        </TouchableOpacity>
                    </View>

                    {/* ── How Are You Feeling Card ────────────────────────────── */}
                    <View style={{
                        backgroundColor: AURORA.card, borderRadius: 24,
                        padding: 20, marginBottom: 16,
                        borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>
                            How are you feeling?
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 13, marginBottom: 20 }}>
                            Tap a mood to check in.
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                            {MOOD_EMOTIONS.map(mood => (
                                <MoodBubble
                                    key={mood.name}
                                    mood={mood}
                                    selected={selectedMood === mood.name}
                                    onPress={() => handleMoodTap(mood.name)}
                                />
                            ))}
                        </View>
                    </View>

                    {/* ── Quick Actions ──────────────────────────────────────── */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                        <QuickActionTile
                            label="Log Mood"
                            icon={<Camera size={20} color="#FFFFFF" />}
                            bgColor={AURORA.blue}
                            wide
                            onPress={() => setShowLogModal(true)}
                        />
                        <QuickActionTile
                            label="Messages"
                            icon={<MessageSquare size={18} color="#FFFFFF" />}
                            bgColor={AURORA.purple}
                            onPress={() => router.push('/(student)/messages')}
                        />
                        <QuickActionTile
                            label="Resources"
                            icon={<BookOpen size={18} color="#FFFFFF" />}
                            bgColor="#1A6B5A"
                            onPress={() => router.push('/(student)/resources')}
                        />
                    </View>

                    {/* ── Stats Row ──────────────────────────────────────────── */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                        <StreakCard streak={stats.streak} />
                        <TrendCard topEmotion={stats.topEmotion} />
                    </View>

                    {/* ── AI Insight ─────────────────────────────────────────── */}
                    <AIInsightCard insight={insight} />
                </ScrollView>
            </SafeAreaView>

            {/* ── Log Mood Modal ─────────────────────────────────────────────── */}
            {showLogModal && (
                <Modal
                    visible={showLogModal}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setShowLogModal(false)}
                >
                    <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 16 : 32, paddingBottom: 12,
                            backgroundColor: AURORA.bg, borderBottomWidth: 1, borderBottomColor: AURORA.border,
                        }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: AURORA.textPrimary }}>Mood Check-In</Text>
                            <TouchableOpacity
                                onPress={() => { setShowLogModal(false); setSelectedMood(null); }}
                                style={{ padding: 8 }}
                            >
                                <X size={22} color={AURORA.textSec} />
                            </TouchableOpacity>
                        </View>
                        <MoodCheckIn onComplete={() => { setShowLogModal(false); setSelectedMood(null); }} />
                    </View>
                </Modal>
            )}
        </View>
    );
}
