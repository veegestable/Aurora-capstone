/**
 * Student "Your week" analytics — ethics-first copy, consistent Mood / Stress Index terms,
 * stagger + count-up animations (respects Reduce Motion).
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    AppState,
    type AppStateStatus,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { Sparkles, TrendingUp, Calendar, ClipboardList } from 'lucide-react-native';
import { useAuth } from '../stores/AuthContext';
import { useUserDaySettings } from '../stores/UserDaySettingsContext';
import { moodService } from '../services/mood.service';
import {
    buildWeekSummaryInput,
    generateWeeklySummary,
} from '../services/weeklySummaryGenerate.service';
import type { MoodData } from '../services/firebase-firestore.service';
import {
    fetchWeeklyAiAnalyticsWithPayload,
    deterministicWeeklyFallback,
    WEEKLY_SUMMARY_FALLBACK_STUDENT_INTRO,
    type WeeklyAiResult,
} from '../services/weeklyAnalyticsAi.service';
import { buildLast7DaysPayload, summarizeWeekSeries } from '../utils/analytics/weeklySeries';
import { calculateCheckInStreakByDayKey } from '../utils/analytics/dateKeys';
import { getDayKey } from '../utils/dayKey';
import { moodLogsToMoodEntries } from '../utils/moodEntryNormalize';
import { aggregateByDay, aggregateByHour, moodStabilityScore } from '../utils/moodAggregates';
import { blendColors } from '../utils/blendColors';
import {
    LineTrendChart,
    ETHICS_ANALYTICS_FOOTER,
} from './analytics/DescriptiveCharts';
import { AnalyticsMoodWidgets } from './analytics/AnalyticsMoodWidgets';
import {
    stressScoreToIndex,
    stressBandPlain,
    averageMoodPlainLine,
} from '../utils/analytics/studentInsightsCopy';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useCountUp } from '../hooks/useCountUp';
import { AURORA } from '../constants/aurora-colors';

const STREAK_MILESTONES = [3, 7, 14, 30];
const SCHOOL_EVENT_TAGS = new Set([
    'classes',
    'study',
    'quiz',
    'exam',
    'homework',
    'deadline',
    'group-project',
    'presentation',
]);

function hexToRgba(hex: string, alpha: number): string {
    const cleaned = hex.replace('#', '');
    const normalized = cleaned.length === 3
        ? cleaned.split('').map((c) => c + c).join('')
        : cleaned;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function weekMoodTone(avgMood: number | null): { label: string; color: string } {
    if (avgMood == null) return { label: 'Not enough check-ins', color: AURORA.blue };
    if (avgMood >= 4.2) return { label: 'Mostly good', color: AURORA.moodHappy };
    if (avgMood >= 3.4) return { label: 'Mostly okay', color: AURORA.moodNeutral };
    if (avgMood >= 2.6) return { label: 'Mixed with lower moments', color: AURORA.moodSurprise };
    return { label: 'Mostly low', color: AURORA.moodSad };
}

type SchoolAnalysis = {
    totalSchoolEvents: number;
    schoolCheckIns: number;
    avgStress5: number;
    avgMood5: number;
    topSchoolEvents: string[];
    dominantEmotion: string;
    sleepPattern: 'mostly_good' | 'mixed' | 'mostly_poor' | 'unknown';
    summary: string;
};

function toFiveScale(value: unknown, fallback = 3): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    if (n <= 5) return Math.max(1, Math.min(5, n));
    return Math.max(1, Math.min(5, Math.round(n / 2)));
}

function analyzeSchoolLogs(
    inputLogs: Array<
        MoodData & {
            log_date: Date;
            event_tags?: string[];
            event_categories?: string[];
            stress_level?: number;
            energy_level?: number;
            sleep_quality?: 'poor' | 'fair' | 'good';
            emotions?: Array<{ emotion?: string }>;
        }
    >
): SchoolAnalysis | null {
    const schoolLogs = inputLogs.filter((l) => {
        const tags = Array.isArray(l.event_tags) ? l.event_tags : [];
        return tags.some((t) => SCHOOL_EVENT_TAGS.has(t));
    });
    if (!schoolLogs.length) return null;

    const eventCount = new Map<string, number>();
    let totalSchoolEvents = 0;
    let stressSum = 0;
    let moodSum = 0;
    const emotionCount = new Map<string, number>();
    let goodSleepCount = 0;
    let poorSleepCount = 0;
    let sleepKnownCount = 0;

    for (const log of schoolLogs) {
        const tags = (Array.isArray(log.event_tags) ? log.event_tags : []).filter((t) => SCHOOL_EVENT_TAGS.has(t));
        totalSchoolEvents += tags.length;
        for (const tag of tags) eventCount.set(tag, (eventCount.get(tag) ?? 0) + 1);
        stressSum += toFiveScale(log.stress_level, 3);
        moodSum += toFiveScale(log.energy_level, 3);
        const primaryEmotion = Array.isArray(log.emotions) ? (log.emotions[0]?.emotion || '').toLowerCase() : '';
        if (primaryEmotion) emotionCount.set(primaryEmotion, (emotionCount.get(primaryEmotion) ?? 0) + 1);
        const sq = log.sleep_quality;
        if (sq === 'good' || sq === 'poor' || sq === 'fair') {
            sleepKnownCount += 1;
            if (sq === 'good') goodSleepCount += 1;
            if (sq === 'poor') poorSleepCount += 1;
        }
    }

    const avgStress5 = stressSum / schoolLogs.length;
    const avgMood5 = moodSum / schoolLogs.length;
    const topSchoolEvents = [...eventCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag, count]) => `${tag} (${count})`);
    const dominantEmotion = [...emotionCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    const sleepPattern: SchoolAnalysis['sleepPattern'] =
        sleepKnownCount === 0 ? 'unknown' :
            goodSleepCount / sleepKnownCount >= 0.6 ? 'mostly_good' :
                poorSleepCount / sleepKnownCount >= 0.45 ? 'mostly_poor' : 'mixed';

    let loadBand = 'Balanced load';
    if (totalSchoolEvents === 0) {
        loadBand = 'Light workload';
    } else if (totalSchoolEvents <= 3) {
        loadBand = 'Balanced load';
    } else if (totalSchoolEvents <= 6) {
        loadBand = 'Busy day';
    } else {
        loadBand = 'Heavy load';
    }
    let summary = `${loadBand}: your school-tagged check-ins show a stable mood and stress pattern.`;
    if (avgMood5 >= 3.8 && avgStress5 <= 2.8 && sleepPattern === 'mostly_good') {
        summary = `${loadBand}: strong pattern today/this week — good sleep plus ${dominantEmotion} mood aligns with lower school stress.`;
    } else if (avgMood5 >= 3.4 && avgStress5 <= 3.3 && sleepPattern !== 'mostly_poor') {
        summary = `${loadBand}: manageable pattern — mood is steady and stress remains in a controllable range.`;
    } else if (avgStress5 >= 4 && (dominantEmotion === 'sadness' || dominantEmotion === 'anger' || dominantEmotion === 'sad')) {
        summary = `${loadBand}: stress is elevated with lower-valence emotions; reduce load where possible and add recovery breaks.`;
    } else if (sleepPattern === 'mostly_poor' && avgStress5 >= 3.3) {
        summary = `${loadBand}: poor sleep appears to coincide with higher school stress in your logs.`;
    } else if (dominantEmotion === 'neutral' && avgStress5 <= 3.6) {
        summary = `${loadBand}: neutral mood with moderate stress suggests a steady but effort-heavy school day.`;
    } else {
        summary = `${loadBand}: mixed signals across mood, stress, sleep, and emotion patterns.`;
    }

    return {
        totalSchoolEvents,
        schoolCheckIns: schoolLogs.length,
        avgStress5,
        avgMood5,
        topSchoolEvents,
        dominantEmotion,
        sleepPattern,
        summary,
    };
}

function EthicsLine() {
    return (
        <Text style={{ color: AURORA.textMuted, fontSize: 11, lineHeight: 16, fontStyle: 'italic' }}>
            {ETHICS_ANALYTICS_FOOTER}
        </Text>
    );
}

/** Shimmer row — Reanimated only (avoids moti → popmotion → broken framesync in Metro). */
function SkeletonLine({ index, reduceMotion }: { index: number; reduceMotion: boolean }) {
    const opacity = useSharedValue(0.42);
    useEffect(() => {
        if (reduceMotion) {
            opacity.value = 0.55;
            return;
        }
        const start = setTimeout(() => {
            opacity.value = withRepeat(
                withSequence(
                    withTiming(0.74, { duration: 880, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.34, { duration: 880, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        }, index * 90);
        return () => clearTimeout(start);
    }, [index, reduceMotion, opacity]);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return (
        <Animated.View
            style={[
                {
                    height: 13,
                    width: '100%',
                    maxWidth: index === 3 ? 260 : undefined,
                    alignSelf: 'stretch',
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                },
                style,
            ]}
        />
    );
}

function AISummarySkeleton({ reduceMotion }: { reduceMotion: boolean }) {
    return (
        <View style={{ gap: 12, paddingVertical: 4 }}>
            {[0, 1, 2, 3].map((i) => (
                <SkeletonLine key={i} index={i} reduceMotion={reduceMotion} />
            ))}
        </View>
    );
}

function BreathingEmptyState() {
    const scale = useSharedValue(1);
    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1.06, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );
    }, [scale]);
    const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    return (
        <Animated.View style={[{ alignItems: 'center', paddingVertical: 24, marginBottom: 8 }, style]}>
            <Text style={{ fontSize: 44 }}>🌿</Text>
            <Text style={{ color: AURORA.textSec, fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                Start logging to see your week come to life.
            </Text>
        </Animated.View>
    );
}

function ChartSection({ children }: { children: React.ReactNode }) {
    return (
        <View
            style={{
                backgroundColor: AURORA.card,
                borderRadius: 20,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: AURORA.border,
            }}
        >
            {children}
        </View>
    );
}

export default function Analytics() {
    const { user } = useAuth();
    const { dayResetHour, timezone } = useUserDaySettings();
    const reduceMotion = useReducedMotion();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [weekSummaryGenerating, setWeekSummaryGenerating] = useState(false);
    const [analyticsView, setAnalyticsView] = useState<'today' | 'week'>('today');
    const [weekSummaryTemplate, setWeekSummaryTemplate] = useState('');
    const [activeWeekPill, setActiveWeekPill] = useState<'days' | 'checkins' | 'streak' | null>(null);
    const [logs, setLogs] = useState<(MoodData & { log_date: Date; id?: string })[]>([]);
    const [weeklyAi, setWeeklyAi] = useState<WeeklyAiResult | null>(null);
    const [celebrateMilestone, setCelebrateMilestone] = useState(false);
    const prevStreakRef = useRef<number | null>(null);
    const isRefreshingLogsRef = useRef(false);
    const latestLogsRef = useRef<(MoodData & { log_date: Date; id?: string })[]>([]);

    useEffect(() => {
        latestLogsRef.current = logs;
    }, [logs]);

    const refreshMoodLogs = useCallback(
        async (opts?: { setBusyState?: boolean }): Promise<(MoodData & { log_date: Date })[]> => {
            if (!user) return [];
            if (isRefreshingLogsRef.current) return latestLogsRef.current as (MoodData & { log_date: Date })[];

            const shouldSetBusyState = opts?.setBusyState ?? false;
            if (shouldSetBusyState) setRefreshing(true);
            isRefreshingLogsRef.current = true;

            try {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 45);
                const moodLogs = await moodService.getMoodLogs(user.id, startDate.toISOString(), endDate.toISOString());
                const list = (moodLogs || []) as (MoodData & { log_date: Date })[];
                setLogs(list);
                return list;
            } catch (e) {
                console.error('Analytics logs refresh failed', e);
                if (shouldSetBusyState) setLogs([]);
                return [];
            } finally {
                isRefreshingLogsRef.current = false;
                if (shouldSetBusyState) setRefreshing(false);
            }
        },
        [user]
    );

    const load = useCallback(async () => {
        if (!user) return;
        try {
            const list = await refreshMoodLogs();
            setLoading(false);
            setRefreshing(false);

            const today = new Date();
            today.setHours(12, 0, 0, 0);
            try {
                setWeekSummaryGenerating(true);
                setWeekSummaryTemplate('');
                const input = buildWeekSummaryInput(list, dayResetHour, timezone);
                const tpl = await generateWeeklySummary(input);
                setWeekSummaryTemplate(tpl);
            } catch {
                setWeekSummaryTemplate('');
            } finally {
                setWeekSummaryGenerating(false);
            }

            setAiLoading(true);
            setWeeklyAi(null);
            try {
                const payload = buildLast7DaysPayload(list);
                const ai = await fetchWeeklyAiAnalyticsWithPayload(payload);
                setWeeklyAi(ai);
            } catch {
                setWeeklyAi(deterministicWeeklyFallback(buildLast7DaysPayload(list)));
            } finally {
                setAiLoading(false);
            }
        } catch (e) {
            console.error('Analytics load failed', e);
            setLogs([]);
            setWeeklyAi(null);
            setLoading(false);
            setRefreshing(false);
            setAiLoading(false);
            setWeekSummaryGenerating(false);
        }
    }, [user, dayResetHour, timezone, refreshMoodLogs]);

    useEffect(() => {
        if (user) {
            setLoading(true);
            load();
        }
    }, [user, load]);

    const streak = useMemo(() => {
        const keys = new Set(
            moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone)
                .map((e) => e.dayKey)
                .filter((x): x is string => !!x)
        );
        return calculateCheckInStreakByDayKey(keys, new Date(), dayResetHour, timezone);
    }, [logs, dayResetHour, timezone]);

    const todayMoodAgg = useMemo(() => {
        const dk = getDayKey(new Date(), dayResetHour, timezone);
        const entries = moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone);
        return aggregateByDay(entries, dk);
    }, [logs, dayResetHour, timezone]);

    const todayEntries = useMemo(() => {
        const dk = getDayKey(new Date(), dayResetHour, timezone);
        const entries = moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone);
        return entries.filter((e) => e.dayKey === dk);
    }, [logs, dayResetHour, timezone]);

    const todayHourly = useMemo(() => aggregateByHour(todayEntries), [todayEntries]);

    const todayLineLabels = useMemo(
        () => Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}h`),
        []
    );

    const todayLineValues = useMemo(() => {
        const byHour = new Map<number, number>();
        for (const h of todayHourly) byHour.set(h.hour, h.avgIntensity);
        return Array.from({ length: 24 }, (_, h) => byHour.get(h) ?? null);
    }, [todayHourly]);

    const todayBlended = useMemo(() => {
        if (!todayEntries.length) return AURORA.blue;
        return blendColors(todayEntries.map((e) => ({ color: e.color, intensity: e.intensity })));
    }, [todayEntries]);

    const todayStability = useMemo(() => {
        const intensities = todayEntries.map((e) => e.intensity);
        return moodStabilityScore(intensities);
    }, [todayEntries]);

    const weekMoodFromEntries = useMemo(() => {
        const entries = moodLogsToMoodEntries(logs as (MoodData & { log_date: Date })[], dayResetHour, timezone);
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const keySet = new Set<string>();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            keySet.add(getDayKey(d, dayResetHour, timezone));
        }
        const slice = entries.filter((x) => keySet.has(x.dayKey || ''));
        if (!slice.length) return null;
        const scales = slice.map((x) => Math.min(5, Math.max(1, Math.ceil(x.intensity / 2))));
        return scales.reduce((a, b) => a + b, 0) / scales.length;
    }, [logs, dayResetHour, timezone]);
    useEffect(() => {
        if (reduceMotion) {
            prevStreakRef.current = streak;
            return;
        }
        const prev = prevStreakRef.current;
        if (prev === null) {
            prevStreakRef.current = streak;
            return;
        }
        if (STREAK_MILESTONES.includes(streak) && streak > prev) {
            setCelebrateMilestone(true);
            const t = setTimeout(() => setCelebrateMilestone(false), 2200);
            prevStreakRef.current = streak;
            return () => clearTimeout(t);
        }
        prevStreakRef.current = streak;
    }, [streak, reduceMotion]);

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    useEffect(() => {
        if (!user || analyticsView !== 'today') return;

        const intervalMs = 30_000;
        const intervalId = setInterval(() => {
            void refreshMoodLogs();
        }, intervalMs);

        return () => clearInterval(intervalId);
    }, [user, analyticsView, refreshMoodLogs]);

    useEffect(() => {
        if (!user || analyticsView !== 'today') return;

        const onAppStateChange = (state: AppStateStatus) => {
            if (state === 'active') {
                void refreshMoodLogs();
            }
        };

        const sub = AppState.addEventListener('change', onAppStateChange);
        return () => sub.remove();
    }, [user, analyticsView, refreshMoodLogs]);

    const weeklyPayload = buildLast7DaysPayload(logs as (MoodData & { log_date: Date })[]);
    const weekCard = summarizeWeekSeries(weeklyPayload);

    const totalCheckIns = logs.length;
    const weekDaysLogged = weeklyPayload.daily_mood.filter((m) => m >= 1 && m <= 5).length;

    const weekStressIndex =
        weekCard.avgStressScore != null ? stressScoreToIndex(weekCard.avgStressScore) : null;
    const weekStressBandLabel = stressBandPlain(
        weekCard.dominantStress === '—' ? 'None' : weekCard.dominantStress
    );

    const displayWeekAvgMood = weekMoodFromEntries ?? weekCard.avgMood;
    const animStress = useCountUp(weekStressIndex, 820, weekStressIndex != null, reduceMotion);
    const animStreak = useCountUp(streak, 640, true, reduceMotion);
    const weekMoodMeta = useMemo(() => weekMoodTone(displayWeekAvgMood), [displayWeekAvgMood]);
    const todaySchoolAnalysis = useMemo(() => {
        const dk = getDayKey(new Date(), dayResetHour, timezone);
        const dayLogs = (logs as Array<MoodData & { log_date: Date; event_tags?: string[]; event_categories?: string[] }>)
            .filter((l) => getDayKey(new Date(l.log_date), dayResetHour, timezone) === dk);
        return analyzeSchoolLogs(dayLogs as any);
    }, [logs, dayResetHour, timezone]);
    const weekSchoolAnalysis = useMemo(() => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const keySet = new Set<string>();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            keySet.add(getDayKey(d, dayResetHour, timezone));
        }
        const weekLogs = (logs as Array<MoodData & { log_date: Date; event_tags?: string[]; event_categories?: string[] }>)
            .filter((l) => keySet.has(getDayKey(new Date(l.log_date), dayResetHour, timezone)));
        return analyzeSchoolLogs(weekLogs as any);
    }, [logs, dayResetHour, timezone]);
    const weekAcademicSignalAvg = useMemo(
        () => (weekSchoolAnalysis ? weekSchoolAnalysis.totalSchoolEvents / 7 : null),
        [weekSchoolAnalysis]
    );
    const weekAcademicLoadBand = useMemo(() => {
        if (weekAcademicSignalAvg == null) return '—';
        if (weekAcademicSignalAvg === 0) return 'Light workload';
        if (weekAcademicSignalAvg <= 2) return 'Balanced load';
        if (weekAcademicSignalAvg <= 4) return 'Busy day';
        return 'Heavy load';
    }, [weekAcademicSignalAvg]);

    const trendPlainSentence = useMemo(() => {
        if (!weeklyAi) return '';
        switch (weeklyAi.trend) {
            case 'Improving':
                return 'Later days in the week showed higher mood numbers than earlier days (from your logs only).';
            case 'Declining':
                return 'Later days in the week showed lower mood numbers than earlier days (from your logs only).';
            case 'Stable':
            default:
                return 'Early and late days in the week stayed in a similar mood range (from your logs only).';
        }
    }, [weeklyAi]);

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <ActivityIndicator color={AURORA.blue} />
                <Text style={{ color: AURORA.textSec, marginTop: 12 }}>Loading your week…</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 48 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AURORA.blue} />}
        >
            {totalCheckIns === 0 ? (
                reduceMotion ? (
                    <View style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 8 }}>
                        <Text style={{ fontSize: 44 }}>🌿</Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                            Start logging to see your week come to life.
                        </Text>
                    </View>
                ) : (
                    <BreathingEmptyState />
                )
            ) : null}

            <View style={{ marginBottom: 12 }}>
                <Text style={{ color: AURORA.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 8 }}>
                    ANALYTICS VIEW
                </Text>
                <View
                    style={{
                        flexDirection: 'row',
                        alignSelf: 'flex-start',
                        backgroundColor: 'rgba(124, 58, 237, 0.16)',
                        borderRadius: 999,
                        padding: 4,
                        borderWidth: 1,
                        borderColor: 'rgba(124, 58, 237, 0.38)',
                        shadowColor: '#7C3AED',
                        shadowOpacity: 0.22,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 4,
                    }}
                >
                <TouchableOpacity
                    onPress={() => setAnalyticsView('today')}
                    style={{
                        paddingVertical: 7,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        alignItems: 'center',
                        backgroundColor: analyticsView === 'today' ? AURORA.purple : 'transparent',
                        borderWidth: analyticsView === 'today' ? 1 : 0,
                        borderColor: analyticsView === 'today' ? 'rgba(255,255,255,0.22)' : 'transparent',
                    }}
                >
                    <Text
                        style={{
                            color: analyticsView === 'today' ? '#FFFFFF' : AURORA.textMuted,
                            fontWeight: '700',
                            fontSize: 12,
                        }}
                    >
                        Today
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setAnalyticsView('week')}
                    style={{
                        paddingVertical: 7,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        alignItems: 'center',
                        backgroundColor: analyticsView === 'week' ? AURORA.purple : 'transparent',
                        borderWidth: analyticsView === 'week' ? 1 : 0,
                        borderColor: analyticsView === 'week' ? 'rgba(255,255,255,0.22)' : 'transparent',
                    }}
                >
                    <Text
                        style={{
                            color: analyticsView === 'week' ? '#FFFFFF' : AURORA.textMuted,
                            fontWeight: '700',
                            fontSize: 12,
                        }}
                    >
                        Week
                    </Text>
                </TouchableOpacity>
                </View>
            </View>

            {analyticsView === 'today' ? (
                <>
            <Text style={{ color: AURORA.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
                Today analytics
            </Text>
            <Text style={{ color: AURORA.textSec, fontSize: 14, lineHeight: 21, marginBottom: 8 }}>
                A focused view of your current day.
            </Text>
            <EthicsLine />

            <ChartSection>
                {todayEntries.length === 0 ? (
                    <Text style={{ color: AURORA.textSec, fontSize: 14 }}>
                        No check-ins yet today. Log your mood to unlock daily analytics.
                    </Text>
                ) : (
                    <>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                            <View style={{ flex: 1, backgroundColor: AURORA.cardAlt, borderRadius: 14, padding: 12 }}>
                                <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>TODAY MOOD</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: todayBlended }} />
                                    <Text style={{ color: AURORA.textPrimary, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' }}>
                                        {todayMoodAgg.dominantMood}
                                    </Text>
                                </View>
                                <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 6 }}>
                                    Avg intensity {todayMoodAgg.avgIntensity.toFixed(1)}/10
                                </Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: AURORA.cardAlt, borderRadius: 14, padding: 12 }}>
                                <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>CHECK-INS</Text>
                                <Text style={{ color: AURORA.textPrimary, fontSize: 28, fontWeight: '900', marginTop: 6 }}>
                                    {todayMoodAgg.entryCount}
                                </Text>
                                <Text style={{ color: AURORA.textSec, fontSize: 12 }}>today</Text>
                            </View>
                        </View>
                        <View style={{ backgroundColor: AURORA.cardAlt, borderRadius: 14, padding: 12, marginBottom: 12 }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>
                                TODAY MOOD STABILITY
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 }}>
                                <Text style={{ color: todayBlended, fontSize: 30, fontWeight: '900' }}>
                                    {todayStability}%
                                </Text>
                                <Text style={{ color: AURORA.textSec, fontSize: 12, marginBottom: 6 }}>
                                    based on today&apos;s check-ins
                                </Text>
                            </View>
                        </View>
                        {todaySchoolAnalysis ? (
                            <View style={{ backgroundColor: AURORA.cardAlt, borderRadius: 14, padding: 12, marginBottom: 12 }}>
                                <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>
                                    ACADEMIC ANALYTICS (TODAY)
                                </Text>
                                <Text style={{ color: AURORA.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 7 }}>
                                    {todaySchoolAnalysis.summary}
                                </Text>
                                <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
                                    School events: {todaySchoolAnalysis.totalSchoolEvents} across {todaySchoolAnalysis.schoolCheckIns} check-in(s)
                                </Text>
                                <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 2 }}>
                                    Mood: {todaySchoolAnalysis.avgMood5.toFixed(1)}/5 • Stress: {todaySchoolAnalysis.avgStress5.toFixed(1)}/5
                                </Text>
                                {todaySchoolAnalysis.topSchoolEvents.length > 0 ? (
                                    <Text style={{ color: AURORA.textMuted, fontSize: 11, marginTop: 6 }}>
                                        Top school events: {todaySchoolAnalysis.topSchoolEvents.join(', ')}
                                    </Text>
                                ) : null}
                            </View>
                        ) : null}
                        <View style={{ marginBottom: 12 }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 8 }}>
                                HOURLY TREND
                            </Text>
                            <LineTrendChart
                                title="Mood spikes in 24 hours"
                                caption="Higher points show hours where your mood intensity peaked."
                                values={todayLineValues}
                                labels={todayLineLabels}
                                yMin={1}
                                yMax={10}
                                stroke={todayBlended}
                                friendlyAxis={{
                                    high: 'High',
                                    mid: 'Mid',
                                    low: 'Low',
                                }}
                                chartHeight={180}
                                xSlot={30}
                                labelEvery={3}
                                zoomable
                            />
                            <View style={{ paddingBottom: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                                    {todayHourly.map((h) => (
                                        <View key={h.hour} style={{ alignItems: 'center', width: `${100 / Math.max(1, todayHourly.length)}%` }}>
                                            <View
                                                style={{
                                                    width: 8,
                                                    height: Math.max(8, h.avgIntensity * 5),
                                                    borderRadius: 6,
                                                    backgroundColor: h.blendedColor,
                                                }}
                                            />
                                            {h.hour % 3 === 0 ? (
                                                <Text style={{ color: AURORA.textMuted, fontSize: 9, marginTop: 4 }}>
                                                    {String(h.hour).padStart(2, '0')}
                                                </Text>
                                            ) : (
                                                <View style={{ height: 14 }} />
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </>
                )}
            </ChartSection>
                </>
            ) : null}

            {analyticsView === 'week' ? (
                <>
            <Text style={{ color: AURORA.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
                Your week analytics
            </Text>
            <Text style={{ color: AURORA.textSec, fontSize: 14, lineHeight: 21, marginBottom: 8 }}>
                Quick mood highlights from your last 7 days.
            </Text>
            <EthicsLine />

            <View style={{ marginTop: 18, marginBottom: 8 }}>
                {weekSchoolAnalysis ? (
                    <View
                        style={{
                            backgroundColor: 'rgba(45, 107, 255, 0.12)',
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: 'rgba(45, 107, 255, 0.32)',
                            padding: 12,
                            marginBottom: 12,
                        }}
                    >
                        <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>
                            ACADEMIC ANALYTICS (WEEK)
                        </Text>
                        <Text style={{ color: AURORA.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 6 }}>
                            {weekSchoolAnalysis.summary}
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
                            School events: {weekSchoolAnalysis.totalSchoolEvents} across {weekSchoolAnalysis.schoolCheckIns} school-tagged check-in(s)
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 2 }}>
                            Mood: {weekSchoolAnalysis.avgMood5.toFixed(1)}/5 • Stress: {weekSchoolAnalysis.avgStress5.toFixed(1)}/5
                        </Text>
                        {weekSchoolAnalysis.topSchoolEvents.length > 0 ? (
                            <Text style={{ color: AURORA.textMuted, fontSize: 11, marginTop: 6 }}>
                                Top school events: {weekSchoolAnalysis.topSchoolEvents.join(', ')}
                            </Text>
                        ) : null}
                    </View>
                ) : null}
                {(() => {
                    const weekPills = [
                        { key: 'days' as const, emoji: '🔥', label: 'Days logged', value: `${weekDaysLogged}/7`, sub: 'active days' },
                        { key: 'checkins' as const, emoji: '✍️', label: 'Check-ins', value: String(totalCheckIns), sub: 'entries this week' },
                        { key: 'streak' as const, emoji: '🚀', label: 'Streak', value: String(Math.round(animStreak)), sub: 'days in a row' },
                    ];
                    const explainer = activeWeekPill === 'days'
                        ? `${weekDaysLogged} out of 7 days had at least one mood check-in.`
                        : activeWeekPill === 'checkins'
                            ? `You logged ${totalCheckIns} mood entries this week in total.`
                            : activeWeekPill === 'streak'
                                    ? `You are on a ${Math.round(animStreak)} day streak.`
                                    : null;
                    return (
                        <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {weekPills.map((pill) => (
                            <TouchableOpacity
                                key={pill.label}
                                activeOpacity={0.9}
                                onPress={() => setActiveWeekPill((prev) => (prev === pill.key ? null : pill.key))}
                                style={{
                                    width: 140,
                                    backgroundColor: activeWeekPill === pill.key ? 'rgba(45, 107, 255, 0.18)' : 'rgba(15, 24, 64, 0.88)',
                                    padding: 13,
                                    borderRadius: 18,
                                    borderWidth: 1,
                                    borderColor: activeWeekPill === pill.key ? AURORA.blue : AURORA.border,
                                    shadowColor: activeWeekPill === pill.key ? AURORA.blue : '#000',
                                    shadowOpacity: activeWeekPill === pill.key ? 0.28 : 0.18,
                                    shadowRadius: activeWeekPill === pill.key ? 10 : 8,
                                    shadowOffset: { width: 0, height: 6 },
                                    elevation: activeWeekPill === pill.key ? 5 : 3,
                                }}
                            >
                                <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700' }}>
                                    {pill.emoji} {pill.label.toUpperCase()}
                                </Text>
                                <Text style={{ color: AURORA.textPrimary, fontSize: 24, fontWeight: '900', marginTop: 8 }}>
                                    {pill.value}
                                </Text>
                                <Text style={{ color: AURORA.textSec, fontSize: 11, marginTop: 2 }} numberOfLines={2}>
                                    {pill.sub}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
                {explainer ? (
                    <View
                        style={{
                            backgroundColor: 'rgba(45, 107, 255, 0.12)',
                            borderWidth: 1,
                            borderColor: 'rgba(45, 107, 255, 0.28)',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            marginBottom: 12,
                        }}
                    >
                        <Text style={{ color: AURORA.textSec, fontSize: 12, lineHeight: 17 }}>{explainer}</Text>
                    </View>
                ) : null}
                        </>
                    );
                })()}

                <Text style={{ color: AURORA.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 10 }}>
                    Last 7 days
                </Text>

                <Animatable.View
                    animation={reduceMotion ? undefined : 'fadeInUp'}
                    duration={reduceMotion ? 0 : 520}
                    delay={0}
                    useNativeDriver
                    style={{
                        width: '100%',
                        backgroundColor: hexToRgba(weekMoodMeta.color, 0.14),
                        padding: 20,
                        borderRadius: 22,
                        marginBottom: 20,
                        borderWidth: 1.5,
                        borderColor: hexToRgba(weekMoodMeta.color, 0.75),
                        shadowColor: weekMoodMeta.color,
                        shadowOpacity: 0.26,
                        shadowRadius: 16,
                        shadowOffset: { width: 0, height: 10 },
                        elevation: 7,
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                        <TrendingUp size={22} color={AURORA.amber} />
                        <View
                            style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: weekMoodMeta.color,
                                borderWidth: 1,
                                borderColor: AURORA.border,
                            }}
                        />
                    </View>
                    <Text style={{ color: AURORA.textMuted, fontSize: 11, fontWeight: '800', marginTop: 12, letterSpacing: 0.6 }}>
                        WEEK MOOD
                    </Text>
                    <Text style={{ color: AURORA.textPrimary, fontSize: 34, fontWeight: '900', marginTop: 6 }}>
                        {weekMoodMeta.label}
                    </Text>
                    <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 10, lineHeight: 19 }}>
                        {averageMoodPlainLine(displayWeekAvgMood)}
                    </Text>
                    <Text style={{ color: AURORA.textMuted, fontSize: 12, marginTop: 8 }}>
                        {weekDaysLogged}/7 active days • {totalCheckIns} total check-ins
                    </Text>
                </Animatable.View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <Animatable.View
                        animation={reduceMotion ? undefined : 'fadeInUp'}
                        duration={reduceMotion ? 0 : 500}
                        delay={reduceMotion ? 0 : 120}
                        useNativeDriver
                        style={{
                            width: '48%',
                            backgroundColor: 'rgba(13, 23, 67, 0.94)',
                            padding: 14,
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor: 'rgba(98, 124, 255, 0.22)',
                            marginBottom: 10,
                            shadowColor: '#000',
                            shadowOpacity: 0.2,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 5 },
                            elevation: 4,
                        }}
                    >
                        <ClipboardList size={20} color={AURORA.blue} />
                        <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', marginTop: 10 }}>
                            😮‍💨 STRESS FEEL
                        </Text>
                        <Text style={{ color: AURORA.textPrimary, fontSize: 26, fontWeight: '800', marginTop: 4 }}>
                            {weekStressIndex != null ? Math.round(animStress) : '—'}
                            <Text style={{ fontSize: 13, color: AURORA.textSec, fontWeight: '600' }}> / 100</Text>
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 11, marginTop: 8, lineHeight: 16 }}>
                            {weekStressBandLabel} this week
                        </Text>
                    </Animatable.View>
                    <Animatable.View
                        animation={reduceMotion ? undefined : 'fadeInUp'}
                        duration={reduceMotion ? 0 : 500}
                        delay={reduceMotion ? 0 : 220}
                        useNativeDriver
                        style={{
                            width: '48%',
                            backgroundColor: 'rgba(13, 23, 67, 0.94)',
                            padding: 14,
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor: 'rgba(98, 124, 255, 0.22)',
                            marginBottom: 10,
                            shadowColor: '#000',
                            shadowOpacity: 0.2,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 5 },
                            elevation: 4,
                        }}
                    >
                        <Calendar size={20} color={AURORA.green} />
                        <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', marginTop: 10 }}>
                            📚 AVG ACADEMIC SIGNAL
                        </Text>
                        <Text style={{ color: AURORA.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 6, lineHeight: 24 }}>
                            {weekAcademicLoadBand}
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 11, marginTop: 8, lineHeight: 16 }}>
                            {weekAcademicSignalAvg != null
                                ? `${weekAcademicSignalAvg.toFixed(1)} school events/day (7-day avg)`
                                : 'No school-tagged check-ins this week'}
                        </Text>
                    </Animatable.View>
                </View>
            </View>

            <View style={{ marginBottom: 14 }}>
                <EthicsLine />
            </View>

            {celebrateMilestone ? (
                <Animatable.View
                    animation="fadeInDown"
                    duration={450}
                    style={{
                        marginBottom: 14,
                        padding: 14,
                        borderRadius: 14,
                        backgroundColor: 'rgba(254, 189, 3, 0.14)',
                        borderWidth: 1,
                        borderColor: 'rgba(254, 189, 3, 0.35)',
                    }}
                >
                    <Text style={{ color: AURORA.amber, fontSize: 15, fontWeight: '800', textAlign: 'center' }}>
                        Nice milestone — keep caring for yourself!
                    </Text>
                </Animatable.View>
            ) : null}

            <Text style={{ color: AURORA.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 4 }}>
                Weekly insight
            </Text>

            <View
                style={{
                    backgroundColor: 'rgba(22, 34, 92, 0.8)',
                    padding: 18,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: 'rgba(91, 117, 255, 0.32)',
                    shadowColor: '#5B75FF',
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 5,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    {aiLoading && !reduceMotion ? (
                        <Animatable.View animation="pulse" iterationCount="infinite" duration={1400}>
                            <Sparkles size={24} color={AURORA.blue} />
                        </Animatable.View>
                    ) : (
                        <Sparkles size={24} color={AURORA.blue} />
                    )}
                    <Text style={{ color: AURORA.textPrimary, fontSize: 18, fontWeight: '800', flex: 1 }}>
                        Written summary for the week
                    </Text>
                </View>

                <Text style={{ color: AURORA.textMuted, fontSize: 12, marginBottom: 12, lineHeight: 17 }}>
                    {weeklyAi?.fromAi
                        ? 'Generated for you from your numbers. Same rules as the charts: describe, not diagnose.'
                        : WEEKLY_SUMMARY_FALLBACK_STUDENT_INTRO}
                </Text>

                {weekSummaryGenerating ? (
                    <Text
                        style={{
                            color: AURORA.textMuted,
                            fontSize: 12,
                            marginBottom: 10,
                            lineHeight: 17,
                            fontStyle: 'italic',
                        }}
                    >
                        Generating your summary…
                    </Text>
                ) : null}
                {aiLoading ? (
                    <AISummarySkeleton reduceMotion={reduceMotion} />
                ) : weeklyAi ? (
                    <>
                        <Text style={{ color: AURORA.textSec, fontSize: 13, marginBottom: 8, lineHeight: 19 }}>
                            {trendPlainSentence}
                        </Text>
                        <Text style={{ color: AURORA.textPrimary, fontSize: 15, lineHeight: 22, marginBottom: 14 }}>
                            {weekSummaryTemplate.length > 0 ? weekSummaryTemplate : weeklyAi.summary}
                        </Text>
                        {weeklyAi.support_note ? (
                            <Text style={{ color: AURORA.amber, fontSize: 14, marginTop: 14, lineHeight: 21 }}>
                                {weeklyAi.support_note}
                            </Text>
                        ) : null}
                    </>
                ) : (
                    <Text style={{ color: AURORA.textSec, fontSize: 14 }}>Summary will show after your data loads.</Text>
                )}

                <View style={{ marginTop: 14 }}>
                    <EthicsLine />
                </View>
            </View>

            {totalCheckIns > 0 ? (
                <ChartSection>
                    <AnalyticsMoodWidgets
                        logs={logs as (MoodData & { log_date: Date })[]}
                        resetHour={dayResetHour}
                        timezone={timezone}
                    />
                </ChartSection>
            ) : null}
                </>
            ) : null}
        </ScrollView>
    );
}
