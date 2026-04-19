import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    Modal, Platform,
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
} from '../../utils/analytics/ethicsDailyAnalytics';
import {
    moodCategoryFromFive,
    stressCategoryFromFive,
    energyCategoryFromFive,
} from '../../utils/analytics/metricCategories';
import { getEmotionLabel } from '../../utils/moodColors';
import { calculateCheckInStreakByDayKey } from '../../utils/analytics/dateKeys';
import { getDayKey } from '../../utils/dayKey';
import { moodLogsToMoodEntries } from '../../utils/moodEntryNormalize';
import { aggregateByDay, moodStabilityScore } from '../../utils/moodAggregates';
import { useUserDaySettings } from '../../stores/UserDaySettingsContext';
import { getUserSettings, updateUserSettings } from '../../services/mood-firestore-v2.service';
import { COUNSELOR_CHECKIN_WINDOW_DAYS } from '../../constants/counselor-checkin-policy';

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

function moodKeyForConsistency(raw: string): 'happy' | 'neutral' | 'sad' | 'angry' | 'surprise' | 'other' {
    const key = (raw || '').toLowerCase().trim();
    if (key === 'joy' || key === 'happiness' || key === 'happy') return 'happy';
    if (key === 'neutral') return 'neutral';
    if (key === 'sad' || key === 'sadness') return 'sad';
    if (key === 'angry' || key === 'anger') return 'angry';
    if (key === 'surprise' || key === 'surprised') return 'surprise';
    return 'other';
}

function trendLabelFromStability(score: number): string {
    if (score >= 80) return 'Very steady';
    if (score >= 60) return 'Mostly steady';
    if (score >= 40) return 'Mixed pattern';
    return 'Shifting pattern';
}

function consistencyMessage(score: number): string {
    if (score >= 80) return 'Positive pattern is strong';
    if (score >= 60) return 'Positive pattern is building';
    if (score >= 40) return 'Positive pattern is mixed';
    return 'Positive pattern is low';
}

// ─── Trend Card ──────────────────────────────────────────────────────────────
function TrendCard({
    trendLabel,
    dominantEmotion,
    consistencyScore,
    consistencyText,
}: {
    trendLabel: string;
    dominantEmotion: string;
    consistencyScore: number;
    consistencyText: string;
}) {
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
                {trendLabel.toUpperCase()}
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', lineHeight: 16 }}>
                {dominantEmotion.toUpperCase() || 'HAPPY'}
            </Text>
            <View style={{ marginTop: 7 }}>
                <View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' }}>
                    <View
                        style={{
                            width: `${Math.max(0, Math.min(100, consistencyScore))}%`,
                            height: 6,
                            borderRadius: 999,
                            backgroundColor: consistencyScore >= 60 ? AURORA.amber : AURORA.blue,
                        }}
                    />
                </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3, flexWrap: 'wrap' }}>
                <Text style={{ color: AURORA.amber, fontSize: 9 }}>✦</Text>
                <Text style={{ color: AURORA.amber, fontSize: 10, fontWeight: '600' }}>
                    {consistencyText} ({Math.round(consistencyScore)}%)
                </Text>
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
    const [showCheckInSharingBriefing, setShowCheckInSharingBriefing] = useState(false);
    const [stats, setStats] = useState({
        streak: 0,
        topEmotion: 'happy',
        trendLabel: 'Stable mood',
        consistencyScore: 50,
        consistencyText: 'Mixed consistency',
    });
    const [insight, setInsight] = useState(
        'Complete a check-in for a short note based on your mood and tasks (no AI on this screen).'
    );

    const firstName = user?.full_name?.split(' ')[0] || 'Student';

    useEffect(() => {
        loadStats();
    }, [user, dayResetHour, timezone]);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const s = await getUserSettings(user.id);
                if (!cancelled && !s.checkInSharingBriefingSeen) {
                    setShowCheckInSharingBriefing(true);
                }
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    const loadStats = async () => {
        if (!user) return;
        try {
            const end = new Date();
            const start = new Date(); start.setDate(start.getDate() - 30);
            const logs = await moodService.getMoodLogs(user.id, start.toISOString(), end.toISOString());
            if (!logs || logs.length === 0) {
                setStats({
                    streak: 0,
                    topEmotion: 'happy',
                    trendLabel: 'Stable mood',
                    consistencyScore: 50,
                    consistencyText: 'Mixed consistency',
                });
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
            const dk = getDayKey(new Date(), dayResetHour, timezone);
            const entries = moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone);
            const now = new Date();
            now.setHours(12, 0, 0, 0);
            const last7Keys = new Set<string>();
            for (let i = 0; i < 7; i++) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                last7Keys.add(getDayKey(d, dayResetHour, timezone));
            }
            const last7Entries = entries.filter((e) => !!e.dayKey && last7Keys.has(e.dayKey));
            const positiveCount = last7Entries.reduce((count, e) => {
                const moodKey = moodKeyForConsistency(e.mood);
                return moodKey === 'happy' || moodKey === 'neutral' ? count + 1 : count;
            }, 0);
            const positiveRatio = last7Entries.length > 0 ? positiveCount / last7Entries.length : 0.5;
            const avgStress = last7Entries.length > 0
                ? last7Entries.reduce((sum, e) => sum + e.stress, 0) / last7Entries.length
                : 3;
            const avgEnergy = last7Entries.length > 0
                ? last7Entries.reduce((sum, e) => sum + e.energy, 0) / last7Entries.length
                : 3;
            const stability = moodStabilityScore(last7Entries.map((e) => e.intensity));
            const stressFactor = 1 - ((avgStress - 1) / 4);
            const energyFactor = (avgEnergy - 1) / 4;
            let consistencyScore = (positiveRatio * 0.6 + stressFactor * 0.25 + energyFactor * 0.15) * 100;
            if (positiveRatio < 0.4 && avgStress >= 3.5) consistencyScore -= 10;
            consistencyScore = Math.max(0, Math.min(100, consistencyScore));
            setStats({
                streak,
                topEmotion,
                trendLabel: trendLabelFromStability(stability),
                consistencyScore,
                consistencyText: consistencyMessage(consistencyScore),
            });
            const todayAgg = aggregateByDay(entries, dk);
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
            const latestTags = Array.isArray(latest?.event_tags) ? latest.event_tags : [];
            const tasks = latestTags.filter((t: string) =>
                ['classes', 'study', 'quiz', 'exam', 'homework', 'deadline', 'group-project', 'presentation'].includes(t)
            ).length;
            const band = classifyStress(calculateStressLevel(moodScale, tasks));
            let line = getDailyFeedback(band, moodScale);
            if (todayAgg.entryCount > 0) {
                const moodOnFive = Math.min(5, Math.max(1, Math.round(todayAgg.avgIntensity / 2)));
                const dominantLabel = getEmotionLabel(todayAgg.dominantMood);
                const moodCat = moodCategoryFromFive(moodOnFive);
                const stressCat = stressCategoryFromFive(todayAgg.avgStress);
                const energyCat = energyCategoryFromFive(todayAgg.avgEnergy);
                if (todayAgg.entryCount === 1) {
                    line =
                        `${line} Your dominant emotion was ${dominantLabel}. In that check-in, your mood was ${moodCat}, ` +
                        `your stress was ${stressCat}, and your energy was ${energyCat}.`;
                } else {
                    line =
                        `${line} Your dominant emotion was ${dominantLabel}. Across ${todayAgg.entryCount} check-ins today, ` +
                        `your mood was ${moodCat}, your stress was ${stressCat}, and your energy was ${energyCat}.`;
                }
            }
            if (tasks > 0) {
                line = `${line} School context was captured in this check-in.`;
            }
            setInsight(line);
        } catch {
            setStats({
                streak: 0,
                topEmotion: 'happy',
                trendLabel: 'Stable mood',
                consistencyScore: 50,
                consistencyText: 'Mixed consistency',
            });
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
                        <TrendCard
                            trendLabel={stats.trendLabel}
                            dominantEmotion={getEmotionLabel(stats.topEmotion)}
                            consistencyScore={stats.consistencyScore}
                            consistencyText={stats.consistencyText}
                        />
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
                onSuccess={({ counselorId }) =>
                    router.push({
                        pathname: '/(student)/messages',
                        params: { counselorId, openSessionRequest: '1' },
                    } as any)
                }
            />

            {/* ── Log Mood Modal ─────────────────────────────────────────────── */}
            <Modal
                visible={showCheckInSharingBriefing}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCheckInSharingBriefing(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    justifyContent: 'center',
                    paddingHorizontal: 24,
                }}>
                    <View style={{
                        backgroundColor: AURORA.card,
                        borderRadius: 20,
                        padding: 22,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                    }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 10 }}>
                            Check-ins & guidance
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 14, lineHeight: 21, marginBottom: 8 }}>
                            If you turn on sharing in Settings, counselors can see a brief summary from your last{' '}
                            {COUNSELOR_CHECKIN_WINDOW_DAYS} days of self-reported stress and energy — not your private notes, and not a diagnosis.
                        </Text>
                        <Text style={{ color: AURORA.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 18 }}>
                            Default is off; you stay in control.
                        </Text>
                        <TouchableOpacity
                            onPress={async () => {
                                if (user?.id) {
                                    try {
                                        await updateUserSettings(user.id, { checkInSharingBriefingSeen: true });
                                    } catch {
                                        /* still dismiss */
                                    }
                                }
                                setShowCheckInSharingBriefing(false);
                            }}
                            style={{
                                backgroundColor: AURORA.blue,
                                borderRadius: 14,
                                paddingVertical: 14,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Got it</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={async () => {
                                if (user?.id) {
                                    try {
                                        await updateUserSettings(user.id, { checkInSharingBriefingSeen: true });
                                    } catch {
                                        /* ignore */
                                    }
                                }
                                setShowCheckInSharingBriefing(false);
                                router.push('/(student)/profile');
                            }}
                            style={{ paddingVertical: 14, alignItems: 'center' }}
                        >
                            <Text style={{ color: AURORA.blue, fontSize: 14, fontWeight: '700' }}>Open Settings</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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

        </View>
    );
}
