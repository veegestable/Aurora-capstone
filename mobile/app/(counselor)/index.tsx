/**
 * Counselor Home Dashboard - index.tsx
 * ======================================
 * Route: /(counselor)/
 * Shows stats overview and recent student risk flags.
 * Data fetched from Firestore students + mood logs.
 */

import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Bell, ChevronRight, Users, AlertTriangle,
    MessageSquare, Calendar,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/stores/AuthContext';
import { AURORA } from '../../src/constants/aurora-colors';
import { LetterAvatar } from '../../src/components/common/LetterAvatar';
import { firestoreService } from '../../src/services/firebase-firestore.service';
import { AnnouncementSection } from '../../src/components/announcements/AnnouncementSection';
import { triggerHaptic } from '../../src/utils/haptics';
import { formatCounselorStudentSubtitle } from '../../src/constants/ccs-student-programs';
import { getSessionScheduledDate } from '../../src/utils/sessionScheduling';
import { fetchStudentCheckInContextForCounselor } from '../../src/services/counselor-checkin-context.service';
import {
    type CounselorSignalPill,
    COUNSELOR_SIGNAL_LABEL,
    COUNSELOR_SIGNAL_SORT,
    counselorSignalFromLogs,
} from '../../src/constants/counselor-checkin-signals';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface FlagItem {
    id: string;
    name: string;
    program: string;
    time: string;
    signal: CounselorSignalPill;
    avatar: string;
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getSignalStyle(signal: CounselorSignalPill) {
    switch (signal) {
        case 'higher_self_report':
            return { border: AURORA.red, badgeBg: 'rgba(239,68,68,0.18)', text: AURORA.red };
        case 'moderate_self_report':
            return { border: AURORA.orange, badgeBg: 'rgba(249,115,22,0.18)', text: AURORA.orange };
        case 'typical_self_report':
            return { border: AURORA.blue, badgeBg: 'rgba(45,107,255,0.18)', text: AURORA.blue };
        case 'no_checkins':
            return { border: AURORA.amber, badgeBg: 'rgba(254,189,3,0.1)', text: AURORA.amber };
        case 'sharing_off':
            return { border: AURORA.textMuted, badgeBg: 'rgba(148,163,184,0.12)', text: AURORA.textMuted };
    }
}

// ─── Sub-components ────────────────────────────────────────────────────────────
interface StatCardProps {
    icon: React.ReactNode;
    count: string | number;
    label: string;
    cardBg?: string;
}

function StatCard({ icon, count, label, cardBg }: StatCardProps) {
    return (
        <View style={{
            flex: 1,
            backgroundColor: cardBg || AURORA.card,
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: AURORA.border,
            minHeight: 120,
        }}>
            {icon}
            <Text style={{
                color: '#FFFFFF', fontSize: 28, fontWeight: '800',
                marginTop: 8, letterSpacing: -0.5,
            }}>
                {count}
            </Text>
            <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 2 }}>
                {label}
            </Text>
        </View>
    );
}

function FlagRow({ item }: { item: FlagItem }) {
    const style = getSignalStyle(item.signal);
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
                triggerHaptic('light');
                router.push({
                    pathname: '/(counselor)/students',
                    params: { openStudentId: item.id },
                });
            }}
            style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: AURORA.card, borderRadius: 16,
                marginBottom: 10, overflow: 'hidden',
                borderWidth: 1, borderColor: AURORA.border,
            }}
        >
            <View style={{ width: 4, backgroundColor: style.border, alignSelf: 'stretch' }} />
            <View style={{ margin: 12 }}>
                <LetterAvatar name={item.name} size={48} avatarUrl={item.avatar} />
            </View>
            <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text
                    style={{ color: AURORA.textSec, fontSize: 12, marginTop: 2 }}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                >
                    {item.program} · {item.time}
                </Text>
            </View>
            <View style={{
                flexShrink: 0,
                backgroundColor: style.badgeBg, borderRadius: 12,
                paddingHorizontal: 10, paddingVertical: 5, marginRight: 8,
                borderWidth: 1, borderColor: `${style.text}44`,
            }}>
                <Text style={{
                    color: style.text, fontSize: 10,
                    fontWeight: '800', letterSpacing: 0.35,
                }} numberOfLines={2}>
                    {COUNSELOR_SIGNAL_LABEL[item.signal]}
                </Text>
            </View>
            <View style={{ flexShrink: 0 }}>
                <ChevronRight size={16} color={AURORA.textMuted} style={{ marginRight: 12 }} />
            </View>
        </TouchableOpacity>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function CounselorHomeScreen() {
    const { user } = useAuth();
    const [studentCount, setStudentCount] = useState<number>(0);
    const [recentFlags, setRecentFlags] = useState<FlagItem[]>([]);
    const [upcomingAcceptedSessions, setUpcomingAcceptedSessions] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const firstName = user?.full_name?.split(' ')[0] || 'Counselor';

    useEffect(() => {
        let cancelled = false;

        async function fetchData() {
            try {
                const students = await firestoreService.getUsersByRole('student');
                if (cancelled) return;

                setStudentCount(students.length);

                // Fetch recent mood logs for students (limit to first 15 for performance)
                const limit = Math.min(15, students.length);
                const studentsWithMood = await Promise.all(
                    students.slice(0, limit).map(async (s) => {
                        try {
                            const { sharingEnabled, logs } = await fetchStudentCheckInContextForCounselor(s.id);
                            const latest = logs[0] as { log_date?: Date; stress_level?: number; energy_level?: number } | undefined;
                            return {
                                student: s,
                                sharingEnabled,
                                logs,
                                lastLogDate: latest?.log_date,
                            };
                        } catch {
                            return {
                                student: s,
                                sharingEnabled: false,
                                logs: [] as { stress_level?: number; energy_level?: number }[],
                                lastLogDate: undefined as Date | undefined,
                            };
                        }
                    })
                );

                if (cancelled) return;

                const flags: FlagItem[] = studentsWithMood
                    .map(({ student, sharingEnabled, logs, lastLogDate }) => {
                        const signal = counselorSignalFromLogs(sharingEnabled, logs);
                        return {
                            id: student.id,
                            name: student.full_name || 'Student',
                            program: formatCounselorStudentSubtitle({
                                department: student.department,
                                program: student.program,
                                year_level: student.year_level,
                            }) || 'CCS',
                            time: !sharingEnabled
                                ? 'Sharing off'
                                : (lastLogDate ? formatTimeAgo(new Date(lastLogDate)) : 'No check-ins yet'),
                            signal,
                            avatar: (student as any).avatar_url ?? '',
                        };
                    })
                    .sort((a, b) => COUNSELOR_SIGNAL_SORT[a.signal] - COUNSELOR_SIGNAL_SORT[b.signal]);

                setRecentFlags(flags);

                if (user?.id) {
                    const sessions = await firestoreService.getSessionsForCounselor(user.id);
                    const now = Date.now();
                    const upcoming = (sessions as Array<Record<string, any>>).filter((s) => {
                        if (s?.status !== 'confirmed') return false;
                        const dt = getSessionScheduledDate({
                            finalSlot: (s.finalSlot as any) ?? null,
                            confirmedSlot: (s.confirmedSlot as any) ?? null,
                            proposedSlots: Array.isArray(s.proposedSlots) ? (s.proposedSlots as any) : [],
                            preferredTimeFromStudent: typeof s.preferredTimeFromStudent === 'string' ? s.preferredTimeFromStudent : undefined,
                        });
                        return !!dt && dt.getTime() >= now;
                    }).length;
                    setUpcomingAcceptedSessions(upcoming);
                } else {
                    setUpcomingAcceptedSessions(0);
                }
            } catch {
                if (!cancelled) {
                    setRecentFlags([]);
                    setUpcomingAcceptedSessions(0);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchData();
        return () => { cancelled = true; };
    }, [user?.id]);

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ─────────────────────────────────────────────── */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
                }}>
                    <View style={{ borderWidth: 2, borderColor: AURORA.green, borderRadius: 27 }}>
                        <LetterAvatar name={user?.full_name ?? 'Counselor'} size={50} avatarUrl={user?.avatar_url} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{
                            color: AURORA.textSec, fontSize: 11,
                            fontWeight: '700', letterSpacing: 1.4,
                        }}>
                            COUNSELOR PORTAL
                        </Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 2 }}>
                            Hello, {firstName}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => triggerHaptic('light')}
                        style={{
                        width: 42, height: 42, borderRadius: 21,
                        backgroundColor: AURORA.card,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        <Bell size={20} color={AURORA.textSec} />
                        <View style={{
                            position: 'absolute', top: 9, right: 9,
                            width: 8, height: 8, borderRadius: 4,
                            backgroundColor: AURORA.red,
                            borderWidth: 1.5, borderColor: AURORA.card,
                        }} />
                    </TouchableOpacity>
                </View>

                {/* ── Scrollable Content ───────────────────────────────── */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                >
                    {/* Dashboard Overview */}
                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 14,
                    }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                            Dashboard Overview
                        </Text>
                        
                    </View>

                    {/* Stat Cards Row 1 */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                        <StatCard
                            icon={
                                <View style={{
                                    width: 38, height: 38, borderRadius: 19,
                                    backgroundColor: 'rgba(45,107,255,0.15)',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Users size={18} color={AURORA.blue} />
                                </View>
                            }
                            count={studentCount}
                            label="Total Students"
                        />
                        <StatCard
                            icon={
                                <View style={{
                                    width: 38, height: 38, borderRadius: 19,
                                    backgroundColor: 'rgba(16,185,129,0.2)',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Calendar size={18} color={AURORA.green} />
                                </View>
                            }
                            count={upcomingAcceptedSessions}
                            label="Upcoming Accepted Sessions"
                            cardBg="rgba(5,67,52,0.5)"
                        />
                    </View>



                    {/* Recent Flags */}
                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 14,
                    }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                            Recent check-ins
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                triggerHaptic('light');
                                router.push('/(counselor)/students');
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                            <Text style={{ color: AURORA.blue, fontSize: 13, fontWeight: '700' }}>
                                VIEW ALL
                            </Text>
                            <ChevronRight size={14} color={AURORA.blue} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 14 }}>
                                Loading...
                            </Text>
                        </View>
                    ) : recentFlags.length === 0 ? (
                        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 14 }}>
                                No students to show here yet.
                            </Text>
                        </View>
                    ) : (
                        recentFlags.map((item) => <FlagRow key={item.id} item={item} />)
                    )}

                    {/* ── Announcements (dynamic, from admin/counselor) ───────── */}
                    <AnnouncementSection role="counselor" showAddButton />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
