/**
 * Student "Your week" analytics — ethics-first copy, consistent Mood / Stress Index terms,
 * stagger + count-up animations (respects Reduce Motion).
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import * as Animatable from 'react-native-animatable';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { Sparkles, TrendingUp, Calendar, ClipboardList, Flame } from 'lucide-react-native';
import { useAuth } from '../stores/AuthContext';
import { moodService } from '../services/mood.service';
import type { MoodData } from '../services/firebase-firestore.service';
import {
    fetchWeeklyAiAnalyticsWithPayload,
    deterministicWeeklyFallback,
    WEEKLY_SUMMARY_FALLBACK_STUDENT_INTRO,
    type WeeklyAiResult,
} from '../services/weeklyAnalyticsAi.service';
import { buildDailyChartPoints, moodDistributionCounts } from '../utils/analytics/chartSeries';
import { buildLast7DaysPayload, summarizeWeekSeries } from '../utils/analytics/weeklySeries';
import { calculateCheckInStreak } from '../utils/analytics/dateKeys';
import {
    LineTrendChart,
    TaskLoadBarChart,
    MoodDistributionDonut,
    MoodWeekStrip,
    ETHICS_ANALYTICS_FOOTER,
} from './analytics/DescriptiveCharts';
import {
    stressScoreToIndex,
    stressBandPlain,
    averageMoodPlainLine,
    dominantStressPlain,
    polishStudentBullet,
} from '../utils/analytics/studentInsightsCopy';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useCountUp } from '../hooks/useCountUp';
import { AURORA } from '../constants/aurora-colors';

const CHART_DAYS = 21;
const STREAK_MILESTONES = [3, 7, 14, 30];

function EthicsLine() {
    return (
        <Text style={{ color: AURORA.textMuted, fontSize: 11, lineHeight: 16, fontStyle: 'italic' }}>
            {ETHICS_ANALYTICS_FOOTER}
        </Text>
    );
}

function FadeInChart({
    children,
    delay = 0,
    reduceMotion,
}: {
    children: React.ReactNode;
    delay?: number;
    reduceMotion: boolean;
}) {
    const opacity = useSharedValue(reduceMotion ? 1 : 0);
    useEffect(() => {
        if (reduceMotion) {
            opacity.value = 1;
            return;
        }
        const t = setTimeout(() => {
            opacity.value = withTiming(1, { duration: 580 });
        }, delay);
        return () => clearTimeout(t);
    }, [delay, reduceMotion, opacity]);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return <Animated.View style={style}>{children}</Animated.View>;
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
    const reduceMotion = useReducedMotion();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [logs, setLogs] = useState<(MoodData & { log_date: Date; id?: string })[]>([]);
    const [weeklyAi, setWeeklyAi] = useState<WeeklyAiResult | null>(null);
    const [celebrateMilestone, setCelebrateMilestone] = useState(false);
    const prevStreakRef = useRef<number | null>(null);

    const load = useCallback(async () => {
        if (!user) return;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 45);
        try {
            const moodLogs = await moodService.getMoodLogs(user.id, startDate.toISOString(), endDate.toISOString());
            const list = (moodLogs || []) as (MoodData & { log_date: Date })[];
            setLogs(list);
            setLoading(false);
            setRefreshing(false);

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
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            setLoading(true);
            load();
        }
    }, [user, load]);

    const streak = calculateCheckInStreak(logs as { log_date: Date }[], new Date());
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

    const points = buildDailyChartPoints(logs as (MoodData & { log_date: Date })[], CHART_DAYS);
    const dist = moodDistributionCounts(points);
    const weeklyPayload = buildLast7DaysPayload(logs as (MoodData & { log_date: Date })[]);
    const weekCard = summarizeWeekSeries(weeklyPayload);

    const moodVals = points.map((p) => p.moodScale);
    const stressVals = points.map((p) => p.stressScore);
    const stressIndexVals = stressVals.map((v) => (v == null ? null : stressScoreToIndex(v)));
    const taskVals = points.map((p) => p.tasks);
    const labels = points.map((p) => p.labelShort);

    const totalCheckIns = logs.length;
    const daysWithData = points.filter((p) => p.moodScale != null).length;
    const donutTotal = dist.positive + dist.neutral + dist.low;

    const weekStressIndex =
        weekCard.avgStressScore != null ? stressScoreToIndex(weekCard.avgStressScore) : null;
    const weekStressBandLabel = stressBandPlain(
        weekCard.dominantStress === '—' ? 'None' : weekCard.dominantStress
    );

    const animMood = useCountUp(weekCard.avgMood, 820, weekCard.avgMood != null, reduceMotion);
    const animStress = useCountUp(weekStressIndex, 820, weekStressIndex != null, reduceMotion);
    const animTasks = useCountUp(weekCard.totalTasks, 700, true, reduceMotion);
    const animStreak = useCountUp(streak, 640, true, reduceMotion);

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

            <Text style={{ color: AURORA.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
                Your week in view
            </Text>
            <Text style={{ color: AURORA.textSec, fontSize: 14, lineHeight: 21, marginBottom: 8 }}>
                Everything here is based only on what you already logged.
            </Text>
            <EthicsLine />

            <View style={{ marginTop: 18, marginBottom: 8 }}>
                <View
                    style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 10,
                        marginBottom: 14,
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            minWidth: '47%',
                            backgroundColor: AURORA.cardAlt,
                            padding: 14,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: AURORA.border,
                        }}
                    >
                        <Text style={{ color: AURORA.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                            DAYS ON CHART
                        </Text>
                        <Text style={{ color: AURORA.textPrimary, fontSize: 26, fontWeight: '800' }}>
                            {daysWithData}/{CHART_DAYS}
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 4 }}>
                            days with a check-in in this window
                        </Text>
                    </View>
                    <View
                        style={{
                            flex: 1,
                            minWidth: '47%',
                            backgroundColor: AURORA.cardAlt,
                            padding: 14,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: AURORA.border,
                        }}
                    >
                        <Text style={{ color: AURORA.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                            ALL ENTRIES
                        </Text>
                        <Text style={{ color: AURORA.textPrimary, fontSize: 26, fontWeight: '800' }}>{totalCheckIns}</Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 4 }}>
                            journal entries we loaded
                        </Text>
                    </View>
                </View>

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
                        backgroundColor: AURORA.card,
                        padding: 18,
                        borderRadius: 18,
                        marginBottom: 12,
                        borderWidth: 2,
                        borderColor: AURORA.blue,
                    }}
                >
                    <TrendingUp size={22} color={AURORA.amber} />
                    <Text style={{ color: AURORA.textMuted, fontSize: 11, fontWeight: '800', marginTop: 12, letterSpacing: 0.6 }}>
                        AVERAGE MOOD
                    </Text>
                    <Text style={{ color: AURORA.textPrimary, fontSize: 36, fontWeight: '900', marginTop: 6 }}>
                        {weekCard.avgMood != null ? animMood.toFixed(1) : '—'}
                        <Text style={{ fontSize: 18, color: AURORA.textSec, fontWeight: '700' }}> / 5</Text>
                    </Text>
                    <Text style={{ color: AURORA.textSec, fontSize: 13, marginTop: 10, lineHeight: 19 }}>
                        From your check-in mood (1 low, 5 high). {averageMoodPlainLine(weekCard.avgMood)}
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
                            backgroundColor: AURORA.card,
                            padding: 14,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: AURORA.border,
                            marginBottom: 10,
                        }}
                    >
                        <ClipboardList size={20} color={AURORA.blue} />
                        <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', marginTop: 10 }}>
                            TYPICAL STRESS INDEX
                        </Text>
                        <Text style={{ color: AURORA.textPrimary, fontSize: 26, fontWeight: '800', marginTop: 4 }}>
                            {weekStressIndex != null ? Math.round(animStress) : '—'}
                            <Text style={{ fontSize: 13, color: AURORA.textSec, fontWeight: '600' }}> / 100</Text>
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 11, marginTop: 8, lineHeight: 16 }}>
                            0 = calmer on paper, 100 = busier on paper (not medical). This week: {weekStressBandLabel}.
                        </Text>
                    </Animatable.View>
                    <Animatable.View
                        animation={reduceMotion ? undefined : 'fadeInUp'}
                        duration={reduceMotion ? 0 : 500}
                        delay={reduceMotion ? 0 : 220}
                        useNativeDriver
                        style={{
                            width: '48%',
                            backgroundColor: AURORA.card,
                            padding: 14,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: AURORA.border,
                            marginBottom: 10,
                        }}
                    >
                        <Calendar size={20} color={AURORA.green} />
                        <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', marginTop: 10 }}>
                            TASKS LISTED
                        </Text>
                        <Text style={{ color: AURORA.textPrimary, fontSize: 26, fontWeight: '800', marginTop: 4 }}>
                            {Math.round(animTasks)}
                        </Text>
                        <Text style={{ color: AURORA.textSec, fontSize: 11, marginTop: 8, lineHeight: 16 }}>
                            Classes + exams + deadlines from check-ins.
                        </Text>
                    </Animatable.View>
                    <Animatable.View
                        animation={reduceMotion ? undefined : 'fadeInUp'}
                        duration={reduceMotion ? 0 : 500}
                        delay={reduceMotion ? 0 : 320}
                        useNativeDriver
                        style={{
                            width: '100%',
                            backgroundColor: AURORA.card,
                            padding: 14,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: AURORA.border,
                            marginBottom: 10,
                        }}
                    >
                        <Flame size={20} color={AURORA.purple} />
                        <Text style={{ color: AURORA.textMuted, fontSize: 10, fontWeight: '700', marginTop: 10 }}>
                            STREAK
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <Text style={{ color: AURORA.textPrimary, fontSize: 26, fontWeight: '800' }}>
                                {Math.round(animStreak)}
                            </Text>
                            {streak > 0 && !reduceMotion ? (
                                <Animatable.Text
                                    animation="pulse"
                                    iterationCount="infinite"
                                    duration={1600}
                                    style={{ fontSize: 18 }}
                                >
                                    🔥
                                </Animatable.Text>
                            ) : null}
                        </View>
                        <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
                            {streak === 0
                                ? 'Start your streak today — log how you are feeling!'
                                : `Keep it going! You are on a ${streak}-day streak.`}
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

            <Text style={{ color: AURORA.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 4, marginTop: 4 }}>
                Charts — last {CHART_DAYS} days
            </Text>
            <Text style={{ color: AURORA.textMuted, fontSize: 12, marginBottom: 12 }}>Pull down to refresh.</Text>

            <ChartSection>
                <FadeInChart delay={0} reduceMotion={reduceMotion}>
                    <MoodWeekStrip points={points} />
                </FadeInChart>
            </ChartSection>

            <ChartSection>
                <FadeInChart delay={reduceMotion ? 0 : 70} reduceMotion={reduceMotion}>
                    <LineTrendChart
                        title="Mood over time"
                        caption="Each dot is a day you logged. Higher = better mood that day."
                        values={moodVals}
                        labels={labels}
                        yMin={1}
                        yMax={5}
                        stroke={AURORA.green}
                        friendlyAxis={{ high: 'Better mood (5)', mid: 'Okay (3)', low: 'Lower mood (1)' }}
                        chartHeight={210}
                    />
                </FadeInChart>
            </ChartSection>

            <ChartSection>
                <FadeInChart delay={reduceMotion ? 0 : 140} reduceMotion={reduceMotion}>
                    <LineTrendChart
                        title="Stress Index over time"
                        caption="Same days as above. Higher = busier on paper, from your mood + tasks (not medical)."
                        values={stressIndexVals}
                        labels={labels}
                        yMin={0}
                        yMax={100}
                        stroke={AURORA.purpleBright}
                        friendlyAxis={{ high: 'Higher index (100)', mid: 'Halfway (50)', low: 'Lower index (0)' }}
                        chartHeight={210}
                    />
                </FadeInChart>
            </ChartSection>

            <ChartSection>
                <FadeInChart delay={reduceMotion ? 0 : 210} reduceMotion={reduceMotion}>
                    <MoodDistributionDonut
                        title="Your logged days"
                        caption="Share of check-ins by mood level in this window."
                        segments={[
                            {
                                label: '🟢 Good days',
                                value: dist.positive,
                                color: AURORA.green,
                                hint: 'Mood 4–5 when you checked in.',
                            },
                            {
                                label: '⚪ Okay days',
                                value: dist.neutral,
                                color: AURORA.textSec,
                                hint: 'Mood 3 when you checked in.',
                            },
                            {
                                label: '🔵 Low days',
                                value: dist.low,
                                color: AURORA.blue,
                                hint: 'Mood 1–2 when you checked in.',
                            },
                        ]}
                        centerValue={String(donutTotal)}
                        centerLabel="check-ins"
                    />
                </FadeInChart>
            </ChartSection>

            <ChartSection>
                <FadeInChart delay={reduceMotion ? 0 : 280} reduceMotion={reduceMotion}>
                    <TaskLoadBarChart
                        title="Tasks you listed"
                        caption="Per day: classes + exams + deadlines from your check-in."
                        tasks={taskVals}
                        labels={labels}
                        chartHeight={210}
                    />
                </FadeInChart>
            </ChartSection>

            <View
                style={{
                    backgroundColor: AURORA.cardAlt,
                    padding: 16,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: AURORA.border,
                    marginBottom: 16,
                }}
            >
                <Text style={{ color: AURORA.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 6 }}>
                    Quick read
                </Text>
                <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 20 }}>
                    {dominantStressPlain(weekCard.dominantStress)}
                </Text>
                <View style={{ marginTop: 10 }}>
                    <EthicsLine />
                </View>
            </View>

            <View
                style={{
                    backgroundColor: 'rgba(45, 107, 255, 0.12)',
                    padding: 18,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: AURORA.border,
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

                {aiLoading ? (
                    <AISummarySkeleton reduceMotion={reduceMotion} />
                ) : weeklyAi ? (
                    <>
                        <Text style={{ color: AURORA.textSec, fontSize: 13, marginBottom: 8, lineHeight: 19 }}>
                            {trendPlainSentence}
                        </Text>
                        <Text style={{ color: AURORA.textPrimary, fontSize: 15, lineHeight: 22, marginBottom: 14 }}>
                            {weeklyAi.summary}
                        </Text>
                        <Text style={{ color: AURORA.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
                            What stood out
                        </Text>
                        {weeklyAi.observations.map((o, i) => (
                            <Text key={i} style={{ color: AURORA.textSec, fontSize: 14, lineHeight: 21, marginBottom: 6 }}>
                                • {polishStudentBullet(o)}
                            </Text>
                        ))}
                        <Text style={{ color: AURORA.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 14, marginBottom: 8 }}>
                            Ideas to try
                        </Text>
                        {weeklyAi.recommendations.map((o, i) => (
                            <Text key={i} style={{ color: AURORA.textSec, fontSize: 14, lineHeight: 21, marginBottom: 6 }}>
                                • {o}
                            </Text>
                        ))}
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
        </ScrollView>
    );
}
