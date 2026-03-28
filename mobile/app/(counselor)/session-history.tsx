/**
 * Session History - Counselor view of past/upcoming sessions
 * Shows accepted sessions with status badges (Completed, Missed, Cancelled, Pending).
 * Counselor can mark attendance when scheduled date/time is reached.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
    ArrowLeft,
    Search,
    MoreVertical,
    Calendar,
    Clock,
    FileText,
    Share2,
    AlertTriangle,
    CalendarX,
} from 'lucide-react-native';
import { useAuth } from '../../src/stores/AuthContext';
import { firestoreService } from '../../src/services/firebase-firestore.service';
import { AURORA } from '../../src/constants/aurora-colors';
import { LetterAvatar } from '../../src/components/common/LetterAvatar';
import SessionAttendanceModal, { type AttendanceStatus } from '../../src/components/counselor/SessionAttendanceModal';
import SessionHistoryDetailModal, { type SessionHistoryDetailData } from '../../src/components/counselor/SessionHistoryDetailModal';
import { isSessionScheduledTimeReached, parseSlotToDate, parsePreferredTimeToDate } from '../../src/utils/dateHelpers';
import {
    computeSessionHistoryBadge,
    getAgreedSessionSlot,
    getOverdueSchedulingState,
    getSessionScheduledDate,
    type SessionHistoryBadge,
} from '../../src/utils/sessionScheduling';

function formatSlotForDisplay(slot: { date: string; time: string } | null | undefined): { date: string; time: string } | null {
    if (!slot?.date) return null;
    const d = parseSlotToDate({ date: slot.date, time: slot.time ?? '' });
    if (!d) return { date: String(slot.date), time: slot.time ?? '—' };
    return {
        date: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
}

function normalizeProgramForFilter(department?: string): string {
    if (!department) return '';
    const upper = department.toUpperCase();
    if (upper.includes('COMPUTER SCIENCE') || upper.includes('BSCS')) return 'BSCS';
    if (upper.includes('INFORMATION TECHNOLOGY') || upper.includes('BSIT')) return 'BSIT';
    if (upper.includes('INFORMATION SYSTEMS') || upper.includes('BSIS')) return 'BSIS';
    return upper;
}
type ProgramFilter = 'All Sessions' | 'BSCS' | 'BSIT' | 'BSIS';

interface SessionHistoryItem {
    id: string;
    studentId: string;
    studentName: string;
    studentAvatar?: string;
    studentProgram?: string;
    studentYear?: string;
    status: string;
    /** Agreed schedule — primary source for badges (falls back to confirmedSlot for legacy docs). */
    finalSlot?: { date: string; time: string } | null;
    confirmedSlot: { date: string; time: string } | null;
    proposedSlots: Array<{ date: string; time: string }>;
    preferredTimeFromStudent?: string;
    /** From `sessions/{id}.studentRequestNote` — student message when requesting the session */
    studentRequestNote?: string;
    attendanceNote?: string;
    cancelReason?: string;
    /** Mirrors `sessions.sessionHistoryBadge` — recomputed on fetch */
    sessionHistoryBadge?: SessionHistoryBadge;
    updatedAt: Date;
    createdAt: Date;
}

function formatDateHeader(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - sessionDate.getTime()) / 86400000);
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (diffDays === 0) return `TODAY, ${monthDay.toUpperCase()}`;
    if (diffDays === 1) return `YESTERDAY, ${monthDay.toUpperCase()}`;
    return fullDate.toUpperCase();
}

function getEffectiveStatus(session: SessionHistoryItem): string {
    if (
        [
            'completed',
            'missed',
            'cancelled',
            'rescheduled',
            'needs_rescheduling',
            'expired',
        ].includes(session.status)
    ) {
        return session.status;
    }
    const scheduled = getSessionScheduledDate(session);
    const overdue = getOverdueSchedulingState(scheduled);
    if (overdue === 'expired') return 'expired';
    if (overdue === 'needs_rescheduling') return 'needs_rescheduling';
    return session.status;
}

/** Pill labels come only from `computeSessionHistoryBadge` — never raw Firestore `status` (no "CONFIRMED"). */
function SessionHistoryBadgePill({ badge }: { badge: SessionHistoryBadge }) {
    const config: Record<SessionHistoryBadge, { label: string; color: string }> = {
        pending: { label: 'PENDING', color: AURORA.blue },
        today: { label: 'TODAY', color: AURORA.green },
        completed: { label: 'COMPLETED', color: AURORA.green },
        missed: { label: 'MISSED', color: AURORA.red },
        cancelled: { label: 'CANCELLED', color: AURORA.textMuted },
        expired: { label: 'EXPIRED', color: AURORA.textMuted },
        reschedule: { label: 'RESCHEDULE', color: AURORA.orange },
    };
    const c = config[badge] ?? config.pending;
    return (
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5, borderColor: c.color }}>
            <Text style={{ color: c.color, fontSize: 10, fontWeight: '700' }}>{c.label}</Text>
        </View>
    );
}

export default function SessionHistoryScreen() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [programFilter, setProgramFilter] = useState<ProgramFilter>('All Sessions');
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedSession, setSelectedSession] = useState<SessionHistoryItem | null>(null);

    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        firestoreService.getSessionHistoryForCounselor(user.id).then((data) => {
            if (!cancelled) setSessions(data as SessionHistoryItem[]);
        }).catch(() => {
            if (!cancelled) setSessions([]);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [user?.id]);

    const filteredSessions = useMemo(() => {
        // Only show sessions counselor has acted on: confirmed slot, proposed slots, or terminal status
        let list = sessions.filter(
            (s) =>
                s.finalSlot != null ||
                s.confirmedSlot != null ||
                (s.proposedSlots?.length > 0) ||
                [
                    'completed',
                    'missed',
                    'cancelled',
                    'rescheduled',
                    'needs_rescheduling',
                    'expired',
                ].includes(s.status)
        );
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (s) =>
                    s.studentName.toLowerCase().includes(q) ||
                    s.studentId.toLowerCase().includes(q)
            );
        }
        if (programFilter !== 'All Sessions') {
            list = list.filter((s) => normalizeProgramForFilter(s.studentProgram) === programFilter);
        }
        return list;
    }, [sessions, searchQuery, programFilter]);

    const getSessionDate = (s: SessionHistoryItem): Date | null => {
        const slot = getAgreedSessionSlot(s);
        if (slot) {
            const d = parseSlotToDate(slot);
            if (d) return d;
        }
        if (s.preferredTimeFromStudent) {
            const d = parsePreferredTimeToDate(s.preferredTimeFromStudent);
            if (d) return d;
        }
        return null;
    };

    const groupedByDate = useMemo(() => {
        const groups: Record<string, SessionHistoryItem[]> = {};
        for (const s of filteredSessions) {
            const d = getSessionDate(s) ?? (s.updatedAt instanceof Date ? s.updatedAt : new Date(s.updatedAt));
            const key = d && !isNaN(d.getTime()) ? d.toDateString() : `fallback_${s.id}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        }
        for (const k of Object.keys(groups)) {
            groups[k].sort((a, b) => {
                const da = getSessionDate(a)?.getTime() ?? (a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime());
                const db = getSessionDate(b)?.getTime() ?? (b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime());
                return db - da;
            });
        }
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            if (a.startsWith('fallback_')) return 1;
            if (b.startsWith('fallback_')) return -1;
            const d1 = new Date(a).getTime();
            const d2 = new Date(b).getTime();
            return isNaN(d2) ? -1 : isNaN(d1) ? 1 : d2 - d1;
        });
        return sortedKeys.map((k) => ({ dateKey: k, items: groups[k] }));
    }, [filteredSessions]);

    const handleSessionPress = (session: SessionHistoryItem) => {
        setSelectedSession(session);
        setShowDetailModal(true);
    };

    const handleMarkAttendanceFromDetail = () => {
        setShowDetailModal(false);
        if (selectedSession) {
            setShowAttendanceModal(true);
        }
    };

    const mapAttendanceToStatus = (s: AttendanceStatus): 'completed' | 'missed' | 'rescheduled' => {
        if (s === 'showed_up') return 'completed';
        if (s === 'did_not_show') return 'missed';
        return 'rescheduled';
    };

    const handleMarkAttendance = async (status: AttendanceStatus) => {
        if (!selectedSession) return;
        try {
            await firestoreService.markSessionAttendance(
                selectedSession.id,
                mapAttendanceToStatus(status)
            );
            setSessions((prev) =>
                prev.map((s) => {
                    if (s.id !== selectedSession.id) return s;
                    const nextStatus = mapAttendanceToStatus(status);
                    return {
                        ...s,
                        status: nextStatus,
                        sessionHistoryBadge: computeSessionHistoryBadge({ ...s, status: nextStatus }),
                    };
                })
            );
        } catch (e) {
            console.error('Failed to mark attendance:', e);
        } finally {
            setShowAttendanceModal(false);
            setSelectedSession(null);
        }
    };

    const PROGRAMS: ProgramFilter[] = ['All Sessions', 'BSCS', 'BSIT', 'BSIS'];

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgMessages }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: AURORA.border,
                    }}
                >
                    <TouchableOpacity
                        onPress={() => router.replace('/(counselor)/messages')}
                        style={{ padding: 4 }}
                    >
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
                        Session History
                    </Text>
                    <TouchableOpacity style={{ padding: 4 }}>
                        <MoreVertical size={22} color={AURORA.textSec} />
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: AURORA.card,
                        borderRadius: 12,
                        marginHorizontal: 16,
                        marginTop: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        gap: 10,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                    }}
                >
                    <Search size={18} color={AURORA.textSec} />
                    <TextInput
                        style={{
                            flex: 1,
                            color: '#FFFFFF',
                            fontSize: 14,
                            paddingVertical: 0,
                        }}
                        placeholder="Search student name or ID..."
                        placeholderTextColor={AURORA.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                
                <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
                {/* Filter chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        gap: 8,
                        flexDirection: 'row',
                    }}
                >
                    {PROGRAMS.map((p) => (
                        <TouchableOpacity
                            key={p}
                            onPress={() => setProgramFilter(p)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: programFilter === p ? AURORA.blue : 'transparent',
                                borderWidth: 1,
                                borderColor: programFilter === p ? AURORA.blue : AURORA.border,
                                gap: 4,
                            }}
                        >
                            <Text
                                style={{
                                    color: programFilter === p ? '#FFFFFF' : AURORA.textSec,
                                    fontSize: 13,
                                    fontWeight: programFilter === p ? '700' : '500',
                                }}
                            >
                                {p}
                            </Text>
                            {p !== 'All Sessions' && (
                                <Text style={{ color: programFilter === p ? '#FFFFFF' : AURORA.textSec, fontSize: 10 }}>
                                    ▼
                                </Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                </View>
                {/* Session list */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                >
                    {loading ? (
                        <View style={{ paddingTop: 60, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={AURORA.blue} />
                        </View>
                    ) : groupedByDate.length === 0 ? (
                        <View style={{ paddingTop: 60, alignItems: 'center' }}>
                            <Text style={{ color: AURORA.textMuted, fontSize: 14, textAlign: 'center' }}>
                                No sessions found. Accepted session requests will appear here.
                            </Text>
                        </View>
                    ) : (
                        groupedByDate.map(({ dateKey, items }) => {
                            const firstItem = items[0];
                            const firstDate = firstItem ? (getSessionDate(firstItem) ?? (firstItem.updatedAt instanceof Date ? firstItem.updatedAt : new Date(firstItem.updatedAt))) : new Date();
                            const header = dateKey.startsWith('fallback_') ? formatDateHeader(firstDate) : formatDateHeader(firstDate);
                            return (
                                <View key={dateKey} style={{ marginBottom: 20 }}>
                                    <Text
                                        style={{
                                            color: AURORA.textMuted,
                                            fontSize: 11,
                                            fontWeight: '600',
                                            letterSpacing: 0.5,
                                            marginBottom: 8,
                                        }}
                                    >
                                        {header}
                                    </Text>
                                    <View
                                        style={{
                                            height: 1,
                                            backgroundColor: AURORA.border,
                                            marginBottom: 12,
                                        }}
                                    />
                                    {items.map((session) => (
                                        <SessionHistoryCard
                                            key={session.id}
                                            session={session}
                                            onPress={() => handleSessionPress(session)}
                                        />
                                    ))}
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            </SafeAreaView>

            {/* Session Detail Modal */}
            <SessionHistoryDetailModal
                visible={showDetailModal}
                data={selectedSession ? {
                    ...selectedSession,
                    sessionHistoryBadge: computeSessionHistoryBadge(selectedSession),
                    dateDisplay: formatSlotForDisplay(getAgreedSessionSlot(selectedSession) ?? selectedSession.proposedSlots?.[0])?.date ?? selectedSession.finalSlot?.date ?? selectedSession.confirmedSlot?.date ?? selectedSession.proposedSlots?.[0]?.date,
                    timeDisplay: formatSlotForDisplay(getAgreedSessionSlot(selectedSession) ?? selectedSession.proposedSlots?.[0])?.time ?? selectedSession.finalSlot?.time ?? selectedSession.confirmedSlot?.time ?? selectedSession.proposedSlots?.[0]?.time ?? selectedSession.preferredTimeFromStudent,
                } as SessionHistoryDetailData : null}
                canMarkAttendance={
                    selectedSession
                        ? !!((getAgreedSessionSlot(selectedSession) ?? selectedSession.proposedSlots?.[0]) &&
                            isSessionScheduledTimeReached(getAgreedSessionSlot(selectedSession) ?? selectedSession.proposedSlots?.[0]!) &&
                            ['confirmed', 'pending', 'requested', 'needs_rescheduling', 'expired'].includes(
                                getEffectiveStatus(selectedSession)
                            ))
                        : false
                }
                    onClose={() => { setShowDetailModal(false); setSelectedSession(null); }}
                onMarkAttendance={handleMarkAttendanceFromDetail}
                onViewNote={() => {}}
            />

            {/* Session Attendance Modal */}
            {selectedSession && (
                <SessionAttendanceModal
                    visible={showAttendanceModal}
                    student={{
                        id: selectedSession.studentId,
                        name: selectedSession.studentName,
                        avatar: selectedSession.studentAvatar ?? '',
                    }}
                    session={{
                        date: formatSlotForDisplay(getAgreedSessionSlot(selectedSession) ?? selectedSession.proposedSlots?.[0])?.date ?? selectedSession.finalSlot?.date ?? selectedSession.confirmedSlot?.date ?? selectedSession.proposedSlots?.[0]?.date ?? '',
                        timeRange: formatSlotForDisplay(getAgreedSessionSlot(selectedSession) ?? selectedSession.proposedSlots?.[0])?.time ?? selectedSession.finalSlot?.time ?? selectedSession.confirmedSlot?.time ?? selectedSession.proposedSlots?.[0]?.time ?? selectedSession.preferredTimeFromStudent ?? '',
                    }}
                    onClose={() => {
                        setShowAttendanceModal(false);
                        setSelectedSession(null);
                    }}
                    onMarkLater={() => {
                        setShowAttendanceModal(false);
                        setSelectedSession(null);
                    }}
                    onMarkStatus={(status) => {
                        handleMarkAttendance(status);
                        setSelectedSession(null);
                    }}
                />
            )}
        </View>
    );
}

function SessionHistoryCard({
    session,
    onPress,
}: {
    session: SessionHistoryItem;
    onPress: () => void;
}) {
    const rawSlot = getAgreedSessionSlot(session) ?? session.proposedSlots[0];
    const slot = formatSlotForDisplay(rawSlot) ?? rawSlot;
    const canMarkAttendance =
        rawSlot &&
        isSessionScheduledTimeReached(rawSlot) &&
        ['confirmed', 'pending', 'requested', 'needs_rescheduling', 'expired'].includes(
            getEffectiveStatus(session)
        );

    const badge = computeSessionHistoryBadge(session);

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={{
                backgroundColor: AURORA.card,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: AURORA.border,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <LetterAvatar
                    name={session.studentName}
                    size={48}
                    avatarUrl={session.studentAvatar}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                        }}
                    >
                        <Text
                            style={{
                                color: '#FFFFFF',
                                fontSize: 16,
                                fontWeight: '700',
                            }}
                        >
                            {session.studentName}
                        </Text>
                        <SessionHistoryBadgePill badge={badge} />
                    </View>
                    <Text
                        style={{
                            color: AURORA.textSec,
                            fontSize: 13,
                            marginBottom: 10,
                        }}
                    >
                        {[session.studentProgram, session.studentYear].filter(Boolean).join(' • ')}
                    </Text>

                    {session.status === 'completed' && (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <Calendar size={14} color={AURORA.textSec} />
                                <Text style={{ color: AURORA.textSec, fontSize: 13 }}>
                                    {slot?.date ?? '-'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <Clock size={14} color={AURORA.textSec} />
                                <Text style={{ color: AURORA.textSec, fontSize: 13 }}>
                                    {slot?.time ?? '-'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        backgroundColor: AURORA.blue,
                                        borderRadius: 10,
                                        paddingVertical: 10,
                                    }}
                                >
                                    <FileText size={16} color="#FFFFFF" />
                                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
                                        View Note
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 22,
                                        backgroundColor: AURORA.cardDark,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderWidth: 1,
                                        borderColor: AURORA.border,
                                    }}
                                >
                                    <Share2 size={18} color={AURORA.textSec} />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {session.status === 'missed' && (
                        <>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginBottom: 8,
                                }}
                            >
                                <AlertTriangle size={16} color={AURORA.red} />
                                <Text style={{ color: AURORA.red, fontSize: 13, fontWeight: '600' }}>
                                    Student did not show up
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Clock size={14} color={AURORA.textSec} />
                                <Text style={{ color: AURORA.textSec, fontSize: 13 }}>
                                    {slot?.time ?? '-'}
                                </Text>
                            </View>
                        </>
                    )}

                    {session.status === 'cancelled' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <CalendarX size={14} color={AURORA.textMuted} />
                            <Text style={{ color: AURORA.textMuted, fontSize: 13 }}>
                                {session.cancelReason ?? 'Cancelled'} ({slot?.date ?? '-'})
                            </Text>
                        </View>
                    )}

                    {(badge === 'reschedule' || badge === 'expired') && slot && (
                        <>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginBottom: 8,
                                }}
                            >
                                <AlertTriangle
                                    size={16}
                                    color={badge === 'expired' ? AURORA.textMuted : AURORA.orange}
                                />
                                <Text
                                    style={{
                                        color: badge === 'expired' ? AURORA.textMuted : AURORA.orange,
                                        fontSize: 13,
                                        fontWeight: '600',
                                        flex: 1,
                                    }}
                                >
                                    {badge === 'expired'
                                        ? 'Over 24h past scheduled time — expired. Mark attendance or record will be removed after 7 days.'
                                        : 'Past scheduled time (within 24h) — needs rescheduling or mark attendance.'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <Calendar size={14} color={AURORA.textSec} />
                                <Text style={{ color: AURORA.textSec, fontSize: 13 }}>{slot.date}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Clock size={14} color={AURORA.textSec} />
                                <Text style={{ color: AURORA.textSec, fontSize: 13 }}>{slot.time}</Text>
                            </View>
                            {canMarkAttendance && (
                                <Text
                                    style={{
                                        color: AURORA.blue,
                                        fontSize: 12,
                                        fontWeight: '600',
                                        marginTop: 8,
                                    }}
                                >
                                    Tap to mark attendance
                                </Text>
                            )}
                        </>
                    )}

                    {(badge === 'pending' || badge === 'today') && slot && (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <Calendar size={14} color={AURORA.textSec} />
                                <Text style={{ color: AURORA.textSec, fontSize: 13 }}>{slot.date}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Clock size={14} color={AURORA.textSec} />
                                <Text style={{ color: AURORA.textSec, fontSize: 13 }}>{slot.time}</Text>
                            </View>
                            {canMarkAttendance && (
                                <Text
                                    style={{
                                        color: AURORA.blue,
                                        fontSize: 12,
                                        fontWeight: '600',
                                        marginTop: 8,
                                    }}
                                >
                                    Tap to mark attendance
                                </Text>
                            )}
                        </>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}
