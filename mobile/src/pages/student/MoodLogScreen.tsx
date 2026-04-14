import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    Modal, Platform, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, TrendingUp, Lightbulb, Camera, MessageSquare, BookOpen, X, CalendarPlus, ScanFace } from 'lucide-react-native';
import { useAuth } from '../../stores/AuthContext';
import { router } from 'expo-router';
import { moodService } from '../../services/mood.service';
import type { MoodData } from '../../services/firebase-firestore.service';
import { AURORA } from '../../constants/aurora-colors';
import { LetterAvatar } from '../../components/common/LetterAvatar';
import { MoodCheckIn } from '../../components/MoodCheckIn';
import DashboardSessionRequestModal from '../../components/student/DashboardSessionRequestModal';
import { AnnouncementSection } from '../../components/announcements/AnnouncementSection';
import { triggerHaptic } from '../../utils/haptics';
import {
    calculateStressLevel,
    classifyStress,
    energyLevelToMoodScale,
    getDailyFeedback,
    taskCountFromLog,
} from '../../utils/analytics/ethicsDailyAnalytics';
import { calculateCheckInStreakByDayKey } from '../../utils/analytics/dateKeys';
import { getDayKey } from '../../utils/dayKey';
import { moodLogsToMoodEntries } from '../../utils/moodEntryNormalize';
import { aggregateByDay } from '../../utils/moodAggregates';
import { useUserDaySettings } from '../../stores/UserDaySettingsContext';
import { getDailyContext, setDailyContext } from '../../services/mood-firestore-v2.service';

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
        <TouchableOpacity onPress={() => { triggerHaptic('light'); onPress(); }} activeOpacity={0.8} style={{ alignItems: 'center', gap: 6 }}>
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
            onPress={() => { triggerHaptic('light'); onPress?.(); }}
            activeOpacity={0.75}
            style={{
                flex: wide ? 2 : 1,
                backgroundColor: AURORA.card,
                borderRadius: 18,
                padding: 12,
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
            flex: 1, backgroundColor: AURORA.card, borderRadius: 12,
            padding: 10, borderWidth: 1, borderColor: AURORA.border,
        }}>
            <Text style={{ color: AURORA.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 }}>
                STREAK
            </Text>
            <View style={{
                width: 28, height: 28, borderRadius: 8,
                backgroundColor: 'rgba(249,115,22,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
            }}>
                <Text style={{ fontSize: 16 }}>🔥</Text>
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '800', lineHeight: 21 }}>
                {streak}
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Days</Text>
            <Text style={{ color: AURORA.textSec, fontSize: 9, marginTop: 2 }}>Daily check-in goal met!</Text>
        </View>
    );
}

// ─── Trend Card ──────────────────────────────────────────────────────────────
function TrendCard({ topEmotion }: { topEmotion: string }) {
    return (
        <View style={{
            flex: 1, backgroundColor: AURORA.card, borderRadius: 12,
            padding: 10, borderWidth: 1, borderColor: AURORA.border,
        }}>
            <Text style={{ color: AURORA.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 }}>
                TREND
            </Text>
            <View style={{
                width: 28, height: 28, borderRadius: 8,
                backgroundColor: 'rgba(45,107,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
            }}>
                <TrendingUp size={16} color={AURORA.blue} />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', lineHeight: 16 }}>
                STABLE
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', lineHeight: 16 }}>
                {topEmotion.toUpperCase() || 'HAPPY'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 }}>
                <Text style={{ color: AURORA.amber, fontSize: 9 }}>✦</Text>
                <Text style={{ color: AURORA.amber, fontSize: 10, fontWeight: '600' }}>Consistency</Text>
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
            gap: 12, borderWidth: 1, borderColor: AURORA.border, marginBottom: 16,
        }}>
            <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: 'rgba(124,58,237,0.25)',
                alignItems: 'center', justifyContent: 'center',
            }}>
                <Lightbulb size={22} color={AURORA.purple} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 4 }}>Daily note</Text>
                <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 19 }}>{insight}</Text>
            </View>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MoodLogScreen() {
    const { user } = useAuth();
    const { dayResetHour, timezone } = useUserDaySettings();
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [showLogModal, setShowLogModal] = useState(false);
    const [showSessionRequestModal, setShowSessionRequestModal] = useState(false);
    const [showEodModal, setShowEodModal] = useState(false);
    const [eodExams, setEodExams] = useState(0);
    const [eodQuizzes, setEodQuizzes] = useState(0);
    const [eodDeadlines, setEodDeadlines] = useState(0);
    const [eodAssignments, setEodAssignments] = useState(0);
    const [eodNotes, setEodNotes] = useState('');
    const [stats, setStats] = useState({ streak: 0, topEmotion: 'happy' });
    const [insight, setInsight] = useState(
        'Complete a check-in for a short note based on your mood and tasks (no AI on this screen).'
    );

    const firstName = user?.full_name?.split(' ')[0] || 'Student';

    useEffect(() => {
        loadStats();
    }, [user, dayResetHour, timezone]);

    const openEod = async () => {
        if (!user) return;
        const dk = getDayKey(new Date(), dayResetHour, timezone);
        const existing = await getDailyContext(user.id, dk);
        setEodExams(existing?.exams ?? 0);
        setEodQuizzes(existing?.quizzes ?? 0);
        setEodDeadlines(existing?.deadlines ?? 0);
        setEodAssignments(existing?.assignments ?? 0);
        setEodNotes(existing?.notes ?? '');
        setShowEodModal(true);
    };

    const saveEod = async () => {
        if (!user) return;
        try {
            const dk = getDayKey(new Date(), dayResetHour, timezone);
            await setDailyContext(user.id, dk, {
                exams: eodExams,
                quizzes: eodQuizzes,
                deadlines: eodDeadlines,
                assignments: eodAssignments,
                notes: eodNotes.trim(),
            });
            setShowEodModal(false);
            loadStats();
        } catch (e: any) {
            Alert.alert('Could not save', e?.message || 'Try again');
        }
    };

    const loadStats = async () => {
        if (!user) return;
        try {
            const end = new Date();
            const start = new Date(); start.setDate(start.getDate() - 30);
            const logs = await moodService.getMoodLogs(user.id, start.toISOString(), end.toISOString());
            if (!logs || logs.length === 0) {
                setStats({ streak: 0, topEmotion: 'happy' });
                setInsight(
                    'Complete a check-in for a short note based on your mood and tasks (no AI on this screen).'
                );
                return;
            }
            const emotionCounts: Record<string, number> = {};
            logs.forEach((log: any) => {
                log.emotions?.forEach((e: any) => {
                    emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
                });
            });
            let topEmotion = 'happy';
            let max = 0;
            Object.entries(emotionCounts).forEach(([e, c]) => {
                if (c > max) {
                    max = c;
                    topEmotion = e;
                }
            });
            const keys = new Set(
                moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone)
                    .map((e) => e.dayKey)
                    .filter((x): x is string => !!x)
            );
            const streak = calculateCheckInStreakByDayKey(keys, new Date(), dayResetHour, timezone);
            setStats({ streak, topEmotion });
            const dk = getDayKey(new Date(), dayResetHour, timezone);
            const entries = moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone);
            const todayAgg = aggregateByDay(entries, dk);
            const ctx = await getDailyContext(user.id, dk);
            const taskN = ctx ? ctx.exams + ctx.quizzes + ctx.deadlines + ctx.assignments : 0;
            const sorted = [...logs].sort((a: any, b: any) => {
                const da = a.log_date instanceof Date ? a.log_date : new Date(a.log_date);
                const db = b.log_date instanceof Date ? b.log_date : new Date(b.log_date);
                return db.getTime() - da.getTime();
            });
            const latest = sorted[0] as any;
            const moodScale =
                todayAgg.entryCount > 0
                    ? Math.min(5, Math.max(1, Math.round(todayAgg.avgEnergy)))
                    : energyLevelToMoodScale(latest?.energy_level ?? 5);
            const tasks = taskN > 0 ? taskN : taskCountFromLog(latest || {});
            const band = classifyStress(calculateStressLevel(moodScale, tasks));
            let line = getDailyFeedback(band, moodScale);
            if (todayAgg.entryCount > 0) {
                line = `${line} Today: ${todayAgg.dominantMood} (avg intensity ${todayAgg.avgIntensity.toFixed(1)}/10).`;
                if (todayAgg.entryCount > 1) {
                    line = `${line} Based on ${todayAgg.entryCount} check-ins today.`;
                }
            }
            if (ctx && (ctx.exams || ctx.quizzes || ctx.deadlines || ctx.assignments || ctx.notes?.trim())) {
                const bits: string[] = [];
                if (ctx.exams) bits.push(`${ctx.exams} exam(s)`);
                if (ctx.quizzes) bits.push(`${ctx.quizzes} quiz(zes)`);
                if (ctx.deadlines) bits.push(`${ctx.deadlines} deadline(s)`);
                if (ctx.assignments) bits.push(`${ctx.assignments} assignment(s)`);
                line = `${line} Context: ${bits.join(', ')}${ctx.notes?.trim() ? `. ${ctx.notes.trim()}` : ''}.`;
            }
            setInsight(line);
        } catch {
            setStats({ streak: 0, topEmotion: 'happy' });
        }
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
                            <LetterAvatar
                                name={user?.full_name ?? user?.preferred_name ?? 'Student'}
                                size={44}
                                avatarUrl={user?.avatar_url}
                            />
                            <View>
                                <Text style={{ color: AURORA.textSec, fontSize: 12, letterSpacing: 1 }}>WELCOME BACK</Text>
                                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{user?.preferred_name || user?.full_name || 'Student'}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => triggerHaptic('light')}
                            style={{
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
                            label="Request a Session"
                            icon={<CalendarPlus size={20} color="#FFFFFF" />}
                            bgColor={AURORA.blue}
                            wide
                            onPress={() => setShowSessionRequestModal(true)}
                        />
                        {/* <QuickActionTile
                            label="Log Mood"
                            icon={<Camera size={18} color="#FFFFFF" />}
                            bgColor={AURORA.purple}
                            onPress={() => setShowLogModal(true)}
                        /> */}
                        <QuickActionTile
                            label="Messages"
                            icon={<MessageSquare size={18} color="#FFFFFF" />}
                            bgColor="#7C3AED"
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

                    <TouchableOpacity
                        onPress={() => {
                            triggerHaptic('light');
                            router.push('/(student)/daily-selfie');
                        }}
                        activeOpacity={0.85}
                        style={{
                            backgroundColor: AURORA.card,
                            borderRadius: 20,
                            padding: 18,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: AURORA.border,
                            position: 'relative',
                        }}
                    >
                        <View style={{
                            position: 'absolute',
                            top: 14,
                            right: 14,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                            backgroundColor: 'rgba(148,163,184,0.2)',
                        }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>Preview</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 14,
                                backgroundColor: 'rgba(45,107,255,0.2)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <ScanFace size={24} color={AURORA.blue} />
                            </View>
                            <View style={{ flex: 1, paddingRight: 56 }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>Daily Selfie</Text>
                                <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 4 }}>
                                    See what Aurora notices today
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            triggerHaptic('light');
                            openEod();
                        }}
                        activeOpacity={0.85}
                        style={{
                            backgroundColor: AURORA.cardAlt,
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: AURORA.border,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: AURORA.blue, fontSize: 14, fontWeight: '700' }}>End of Day Review</Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                            Update today&apos;s workload context anytime
                        </Text>
                    </TouchableOpacity>

                    {/* ── Announcements (dynamic, from admin/counselor) ───────── */}
                    <AnnouncementSection role="student" />
                </ScrollView>
            </SafeAreaView>

            {/* ── Session Request Modal ──────────────────────────────────────── */}
            <DashboardSessionRequestModal
                visible={showSessionRequestModal}
                studentId={user?.id ?? ''}
                studentName={user?.full_name}
                studentAvatar={user?.avatar_url}
                onClose={() => setShowSessionRequestModal(false)}
                onSuccess={() => router.push('/(student)/messages')}
            />

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
                                onPress={() => { triggerHaptic('light'); setShowLogModal(false); setSelectedMood(null); }}
                                style={{ padding: 8 }}
                            >
                                <X size={22} color={AURORA.textSec} />
                            </TouchableOpacity>
                        </View>
                        <MoodCheckIn onComplete={() => { setShowLogModal(false); setSelectedMood(null); loadStats(); }} />
                    </View>
                </Modal>
            )}

            <Modal visible={showEodModal} animationType="slide" transparent onRequestClose={() => setShowEodModal(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: AURORA.bg,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        padding: 20,
                        maxHeight: '88%',
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>End of Day Review</Text>
                            <TouchableOpacity onPress={() => setShowEodModal(false)} style={{ padding: 8 }}>
                                <X size={22} color={AURORA.textSec} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            {([
                                ['Exams', eodExams, setEodExams],
                                ['Quizzes', eodQuizzes, setEodQuizzes],
                                ['Deadlines', eodDeadlines, setEodDeadlines],
                                ['Assignments', eodAssignments, setEodAssignments],
                            ] as const).map(([label, val, setV]) => (
                                <View key={label} style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingVertical: 12,
                                    borderBottomWidth: 1,
                                    borderBottomColor: AURORA.border,
                                }}>
                                    <Text style={{ color: AURORA.textPrimary, fontSize: 15 }}>{label}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <TouchableOpacity
                                            onPress={() => setV(Math.max(0, val - 1))}
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 10,
                                                backgroundColor: AURORA.cardAlt,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Text style={{ color: AURORA.textSec, fontSize: 18, fontWeight: '700' }}>−</Text>
                                        </TouchableOpacity>
                                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' }}>
                                            {val}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => setV(val + 1)}
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 10,
                                                backgroundColor: 'rgba(45,107,255,0.2)',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Text style={{ color: AURORA.blue, fontSize: 18, fontWeight: '700' }}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                            <Text style={{ color: AURORA.textSec, marginTop: 12, marginBottom: 8 }}>Notes (optional)</Text>
                            <TextInput
                                value={eodNotes}
                                onChangeText={setEodNotes}
                                placeholder="Anything about today…"
                                placeholderTextColor={AURORA.textMuted}
                                multiline
                                style={{
                                    minHeight: 100,
                                    borderWidth: 1,
                                    borderColor: AURORA.border,
                                    borderRadius: 12,
                                    padding: 12,
                                    color: AURORA.textPrimary,
                                    textAlignVertical: 'top',
                                }}
                            />
                            <TouchableOpacity
                                onPress={saveEod}
                                style={{
                                    marginTop: 20,
                                    backgroundColor: AURORA.blue,
                                    paddingVertical: 16,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Save</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
