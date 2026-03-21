/**
 * Counselor Risk Center - risk-center.tsx
 * =========================================
 * Route: /(counselor)/risk-center
 * Shows prioritized risk cases ranked by severity.
 * Data fetched from Firestore students + mood logs.
 */

import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    Modal, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    AlertTriangle, SlidersHorizontal, AlertCircle, X,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AURORA } from '../../src/constants/aurora-colors';
import { LetterAvatar } from '../../src/components/common/LetterAvatar';
import { firestoreService } from '../../src/services/firebase-firestore.service';
import { useAuth } from '../../src/stores/AuthContext';

// ─── Types ─────────────────────────────────────────────────────────────────────
type CaseStatus = 'open' | 'in_progress' | 'resolved';
type CaseSeverity = 'high' | 'medium' | 'low';

interface RiskCase {
    id: string;
    name: string;
    program: string;
    severity: CaseSeverity;
    timeAgo: string;
    trigger: string;
    triggerType: 'critical' | 'mood' | 'social';
    status: CaseStatus;
    handledBy?: string;
    avatar?: string;
    initials?: string;
}

// ─── Helpers: derive risk from mood log ─────────────────────────────────────────
function deriveSeverityFromMood(stressLevel?: number, energyLevel?: number): CaseSeverity {
    const stress = stressLevel ?? 5;
    const energy = energyLevel ?? 5;
    if (stress >= 7 || energy <= 2) return 'high';
    if (stress >= 5 || energy <= 4) return 'medium';
    return 'low';
}

function getTriggerFromMood(stressLevel?: number, energyLevel?: number): { trigger: string; type: 'critical' | 'mood' | 'social' } {
    const stress = stressLevel ?? 5;
    const energy = energyLevel ?? 5;
    if (stress >= 7 || energy <= 2) {
        return { trigger: 'High stress or very low energy detected in recent mood log.', type: 'critical' };
    }
    if (stress >= 5 || energy <= 4) {
        return { trigger: 'Elevated stress or low energy recorded in mood check-in.', type: 'mood' };
    }
    return { trigger: 'Student monitored. Mood patterns within normal range.', type: 'social' };
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

function formatProgram(department?: string, yearLevel?: string): string {
    const dept = department?.toUpperCase()
        ?.replace('BACHELOR OF SCIENCE IN ', 'BS')
        .replace('COMPUTER SCIENCE', 'CS')
        .replace('INFORMATION TECHNOLOGY', 'IT')
        .replace('INFORMATION SYSTEMS', 'IS') || 'BS';
    const year = yearLevel
        ? `${yearLevel.replace(/st|nd|rd|th/i, (m) => m.toUpperCase())} Year`
        : '1st Year';
    return `${dept} - ${year}`;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

// ─── Severity helpers ──────────────────────────────────────────────────────────
function getSeverityStyle(severity: CaseSeverity) {
    switch (severity) {
        case 'high':
            return { text: AURORA.red, bg: 'rgba(239,68,68,0.15)', border: `${AURORA.red}55`, label: 'HIGH RISK' };
        case 'medium':
            return { text: AURORA.orange, bg: 'rgba(249,115,22,0.15)', border: `${AURORA.orange}55`, label: 'MEDIUM RISK' };
        case 'low':
            return { text: AURORA.amber, bg: 'rgba(254,189,3,0.12)', border: `${AURORA.amber}55`, label: 'LOW RISK' };
    }
}

// ─── Trigger Alert Box ─────────────────────────────────────────────────────────
function TriggerBox({ type, message }: { type: RiskCase['triggerType']; message: string }) {
    const isCritical = type === 'critical';
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 12,
            backgroundColor: isCritical ? 'rgba(239,68,68,0.08)' : AURORA.cardDark,
            borderRadius: 12, padding: 14, marginVertical: 12,
            borderWidth: 1,
            borderColor: isCritical ? 'rgba(239,68,68,0.25)' : AURORA.border,
            borderLeftWidth: isCritical ? 3 : 1,
            borderLeftColor: isCritical ? AURORA.red : AURORA.border,
        }}>
            {isCritical && (
                <AlertCircle size={22} color={AURORA.red} style={{ marginTop: 1 }} />
            )}
            <Text style={{
                flex: 1, color: isCritical ? '#FFFFFF' : AURORA.textSec,
                fontSize: 14, lineHeight: 20,
                fontWeight: isCritical ? '600' : '400',
            }}>
                {message}
            </Text>
        </View>
    );
}

// ─── Risk Case Card ────────────────────────────────────────────────────────────
function RiskCaseCard({
    riskCase,
    onStatusChange,
    onStudentPress,
    onInvite,
}: {
    riskCase: RiskCase;
    onStatusChange: (id: string, status: CaseStatus) => void;
    onStudentPress: (id: string) => void;
    onInvite: (riskCase: RiskCase) => void;
}) {
    const sev = getSeverityStyle(riskCase.severity);
    const isLow = riskCase.severity === 'low';
    const isInProgress = riskCase.status === 'in_progress';

    return (
        <View style={{
            backgroundColor: AURORA.card, borderRadius: 18, padding: 16,
            marginBottom: 14, borderWidth: 1, borderColor: AURORA.border,
        }}>
            {/* Student Header */}
            <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
                onPress={() => onStudentPress(riskCase.id)}
                activeOpacity={0.8}
            >
                <LetterAvatar name={riskCase.name} size={46} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                            {riskCase.name}
                        </Text>
                        <View style={{
                            backgroundColor: sev.bg, borderRadius: 10,
                            paddingHorizontal: 8, paddingVertical: 4,
                            borderWidth: 1, borderColor: sev.border,
                        }}>
                            <Text style={{ color: sev.text, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                                {sev.label}
                            </Text>
                        </View>
                    </View>
                    <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 2 }}>
                        {riskCase.program}
                    </Text>
                </View>
                <Text style={{ color: AURORA.textMuted, fontSize: 12 }}>
                    {riskCase.timeAgo}
                </Text>
            </TouchableOpacity>

            {/* Trigger Box */}
            <TriggerBox type={riskCase.triggerType} message={riskCase.trigger} />

            {/* Handler note */}
            {riskCase.handledBy && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: AURORA.orange }} />
                    <Text style={{ color: AURORA.orange, fontSize: 13, fontWeight: '600' }}>
                        Currently handled by {riskCase.handledBy}
                    </Text>
                </View>
            )}

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
                {isLow ? (
                    <>
                        <TouchableOpacity
                            style={{
                                flex: 1, borderRadius: 12, paddingVertical: 12,
                                borderWidth: 1, borderColor: AURORA.border,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: AURORA.textSec, fontSize: 14, fontWeight: '600' }}>
                                Review
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                flex: 1, borderRadius: 12, paddingVertical: 12,
                                borderWidth: 1, borderColor: AURORA.border,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: AURORA.textSec, fontSize: 14, fontWeight: '600' }}>
                                Dismiss
                            </Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <TouchableOpacity
                            onPress={() => onStatusChange(riskCase.id, 'in_progress')}
                            style={{
                                flex: 1, borderRadius: 12, paddingVertical: 12,
                                borderWidth: 1,
                                borderColor: isInProgress ? AURORA.border : AURORA.borderLight,
                                alignItems: 'center',
                                backgroundColor: isInProgress ? 'rgba(255,255,255,0.04)' : 'transparent',
                            }}
                        >
                            <Text style={{
                                color: isInProgress ? AURORA.textMuted : AURORA.textSec,
                                fontSize: 13, fontWeight: '600',
                            }}>
                                {isInProgress ? 'In Progress' : 'Mark In Progress'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => onInvite(riskCase)}
                            style={{
                                flex: 1, borderRadius: 12, paddingVertical: 12,
                                backgroundColor: AURORA.blue, alignItems: 'center',
                                shadowColor: AURORA.blue,
                                shadowOffset: { width: 0, height: 3 },
                                shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                                Invite:
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
}

// ─── Student Risk Detail Modal (blank for now) ──────────────────────────────────
function StudentRiskModal({
    visible,
    studentName,
    onClose,
}: {
    visible: boolean;
    studentName?: string;
    onClose: () => void;
}) {
    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={modalStyles.sheet}>
                    <View style={modalStyles.handleBar} />
                    <View style={modalStyles.header}>
                        <Text style={modalStyles.title}>
                            {studentName ? `${studentName} - Risk Details` : 'Risk Details'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} hitSlop={12}>
                            <X size={24} color={AURORA.textSec} />
                        </TouchableOpacity>
                    </View>
                    <View style={modalStyles.content}>
                        {/* Blank content for now */}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const modalStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: {
        backgroundColor: AURORA.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: AURORA.border,
        paddingHorizontal: 20,
        paddingBottom: 34,
    },
    handleBar: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: AURORA.border,
        alignSelf: 'center', marginTop: 12, marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    closeBtn: { padding: 4 },
    content: { minHeight: 100 },
});

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function CounselorRiskCenterScreen() {
    const { studentId } = useLocalSearchParams<{ studentId?: string }>();
    const [cases, setCases] = useState<RiskCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalStudentId, setModalStudentId] = useState<string | null>(null);

    useEffect(() => {
        if (studentId) setModalStudentId(studentId);
    }, [studentId]);

    const handleCloseStudentModal = () => setModalStudentId(null);

    const modalStudent = modalStudentId ? cases.find((c) => c.id === modalStudentId) : null;

    useEffect(() => {
        let cancelled = false;

        async function fetchData() {
            try {
                const students = await firestoreService.getUsersByRole('student');
                if (cancelled) return;

                const limit = Math.min(20, students.length);
                const casesWithMood = await Promise.all(
                    students.slice(0, limit).map(async (s) => {
                        try {
                            const logs = await firestoreService.getMoodLogs(s.id);
                            const latest = logs[0] as any;
                            const stressLevel = latest?.stress_level;
                            const energyLevel = latest?.energy_level;
                            const severity = deriveSeverityFromMood(stressLevel, energyLevel);
                            const { trigger, type } = getTriggerFromMood(stressLevel, energyLevel);
                            const logDate = latest?.log_date;
                            return {
                                id: s.id,
                                name: s.full_name || 'Student',
                                program: formatProgram(s.department, s.year_level),
                                severity,
                                timeAgo: logDate ? formatTimeAgo(new Date(logDate)) : 'No logs',
                                trigger,
                                triggerType: type,
                                status: 'open' as CaseStatus,
                                avatar: (s as any).avatar_url ?? '',
                                initials: getInitials(s.full_name || 'S'),
                            } as RiskCase;
                        } catch {
                            return {
                                id: s.id,
                                name: s.full_name || 'Student',
                                program: formatProgram(s.department, s.year_level),
                                severity: 'low' as CaseSeverity,
                                timeAgo: 'No logs',
                                trigger: 'No recent mood data.',
                                triggerType: 'social' as const,
                                status: 'open' as CaseStatus,
                                avatar: (s as any).avatar_url ?? '',
                                initials: getInitials(s.full_name || 'S'),
                            } as RiskCase;
                        }
                    })
                );

                if (cancelled) return;
                setCases(
                    casesWithMood.sort((a, b) => {
                        const order = { high: 0, medium: 1, low: 2 };
                        return order[a.severity] - order[b.severity];
                    })
                );
            } catch {
                if (!cancelled) setCases([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchData();
        return () => {
            cancelled = true;
        };
    }, []);

    const router = useRouter();
    const { user } = useAuth();

    const handleStatusChange = (id: string, status: CaseStatus) => {
        setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    };

    const handleInvite = async (riskCase: RiskCase) => {
        if (!user?.id) return;
        try {
            await firestoreService.addConversation(user.id, {
                id: riskCase.id,
                name: riskCase.name,
                avatar: riskCase.avatar ?? '',
                program: riskCase.program,
                isAlerted: riskCase.severity === 'high',
                borderColor: riskCase.severity === 'high' ? AURORA.red : riskCase.severity === 'medium' ? AURORA.orange : undefined,
            }, { name: user.full_name || 'Counselor', avatar: user.avatar_url });
            router.push('/(counselor)/messages');
        } catch (e) {
            console.error('Failed to add conversation:', e);
        }
    };

    const overview = [
        {
            label: 'High Risk',
            count: cases.filter((c) => c.severity === 'high').length,
            sub: 'Pending Review',
            dot: AURORA.red,
            border: 'rgba(239,68,68,0.3)',
            bg: 'rgba(239,68,68,0.08)',
        },
        {
            label: 'Medium',
            count: cases.filter((c) => c.severity === 'medium').length,
            sub: 'In Progress',
            dot: AURORA.orange,
            border: 'rgba(249,115,22,0.3)',
            bg: 'rgba(249,115,22,0.08)',
        },
        {
            label: 'Low Risk',
            count: cases.filter((c) => c.severity === 'low').length,
            sub: 'Monitored',
            dot: AURORA.amber,
            border: 'rgba(254,189,3,0.3)',
            bg: 'rgba(254,189,3,0.06)',
        },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ─────────────────────────────────────────────── */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16,
                }}>
                    <AlertTriangle size={24} color="#FFFFFF" style={{ marginRight: 10 }} />
                    <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', flex: 1 }}>
                        Risk Center
                    </Text>
                    <TouchableOpacity style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: AURORA.card,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1, borderColor: AURORA.border,
                    }}>
                        <SlidersHorizontal size={18} color={AURORA.textSec} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* ── Overview ───────────────────────────────────────── */}
                    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                        <Text style={{
                            color: AURORA.textMuted, fontSize: 11,
                            fontWeight: '700', letterSpacing: 1.5, marginBottom: 12,
                        }}>
                            OVERVIEW
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {overview.map((ov) => (
                                <View
                                    key={ov.label}
                                    style={{
                                        backgroundColor: ov.bg, borderRadius: 16,
                                        borderWidth: 1, borderColor: ov.border,
                                        padding: 16, marginRight: 12, minWidth: 140,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                        <View style={{
                                            width: 8, height: 8, borderRadius: 4,
                                            backgroundColor: ov.dot,
                                        }} />
                                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                                            {ov.label}
                                        </Text>
                                    </View>
                                    <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '800' }}>
                                        {ov.count}
                                    </Text>
                                    <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 4 }}>
                                        {ov.sub}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* ── Prioritized Cases ──────────────────────────────── */}
                    <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                                Prioritized Cases
                            </Text>
                            <TouchableOpacity>
                                <Text style={{ color: AURORA.blue, fontSize: 13, fontWeight: '700' }}>
                                    View All
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <Text style={{ color: AURORA.textMuted, fontSize: 14 }}>
                                    Loading...
                                </Text>
                            </View>
                        ) : cases.length === 0 ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <Text style={{ color: AURORA.textMuted, fontSize: 14 }}>
                                    No risk cases to display.
                                </Text>
                            </View>
                        ) : (
                            cases.map((c) => (
                                <RiskCaseCard
                                    key={c.id}
                                    riskCase={c}
                                    onStatusChange={handleStatusChange}
                                    onStudentPress={setModalStudentId}
                                    onInvite={handleInvite}
                                />
                            ))
                        )}
                    </View>
                </ScrollView>

                <StudentRiskModal
                    visible={!!modalStudentId}
                    studentName={modalStudent?.name}
                    onClose={handleCloseStudentModal}
                />
            </SafeAreaView>
        </View>
    );
}
