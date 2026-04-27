/**
 * StudentProfileModal — counselor view: optional check-in summary (last N days) + invite.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Alert,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import { X, ChevronDown, Heart, Zap, Smile, Activity, Hash } from 'lucide-react-native';
import { router } from 'expo-router';
import { AURORA } from '../../constants/aurora-colors';
import { LetterAvatar } from '../common/LetterAvatar';
import { formatCounselorStudentSubtitle } from '../../constants/ccs-student-programs';
import { fetchStudentCheckInContextForCounselor } from '../../services/counselor-checkin-context.service';
import { COUNSELOR_CHECKIN_WINDOW_DAYS } from '../../constants/counselor-checkin-policy';
import { firestoreService } from '../../services/firebase-firestore.service';
import type { CounselorSignalPill } from '../../constants/counselor-checkin-signals';
import type { MoodData } from '../../services/firebase-firestore.service';
import type { MergedMoodLog } from '../../services/mood.service';
import { moodLogsToMoodEntries } from '../../utils/moodEntryNormalize';
import { aggregateEntriesAsSingleDay, moodStabilityScore } from '../../utils/moodAggregates';
import { getEmotionLabel } from '../../utils/moodColors';
import {
    energyCategoryLabelFromFive,
    stressCategoryLabelFromFive,
} from '../../utils/analytics/metricCategories';

const DAY_RESET_FALLBACK = 0;

function deviceTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

function stabilityCaption(score: number): string {
    if (score >= 80) return 'Very steady between check-ins';
    if (score >= 60) return 'Mostly steady';
    if (score >= 40) return 'Some shifts';
    return 'Large swings between check-ins';
}

function normalizeStressLabel(label: string): string {
    return label.trim().toLowerCase() === 'normal' ? 'Manageable' : label;
}

function tileVisuals(
    tileId: string,
    value: string,
    rawStress: number,
    rawEnergy: number,
    stabilityPct: number | null
): { tintBg: string; tintBorder: string; icon: React.ReactNode } {
    if (tileId === 'stress') {
        if (rawStress >= 3.8) {
            return {
                tintBg: 'rgba(239,68,68,0.16)',
                tintBorder: 'rgba(239,68,68,0.34)',
                icon: <Heart size={13} color="#FCA5A5" />,
            };
        }
        if (rawStress >= 2.4) {
            return {
                tintBg: 'rgba(245,158,11,0.16)',
                tintBorder: 'rgba(245,158,11,0.34)',
                icon: <Heart size={13} color="#FCD34D" />,
            };
        }
        return {
            tintBg: 'rgba(34,197,94,0.14)',
            tintBorder: 'rgba(34,197,94,0.32)',
            icon: <Heart size={13} color="#86EFAC" />,
        };
    }
    if (tileId === 'energy') {
        if (rawEnergy <= 2.0) {
            return {
                tintBg: 'rgba(148,163,184,0.16)',
                tintBorder: 'rgba(148,163,184,0.3)',
                icon: <Zap size={13} color="#CBD5E1" />,
            };
        }
        if (rawEnergy >= 3.7) {
            return {
                tintBg: 'rgba(20,184,166,0.15)',
                tintBorder: 'rgba(20,184,166,0.34)',
                icon: <Zap size={13} color="#5EEAD4" />,
            };
        }
        return {
            tintBg: 'rgba(45,107,255,0.15)',
            tintBorder: 'rgba(45,107,255,0.34)',
            icon: <Zap size={13} color="#93C5FD" />,
        };
    }
    if (tileId === 'stability') {
        if (stabilityPct != null && stabilityPct >= 70) {
            return {
                tintBg: 'rgba(34,197,94,0.14)',
                tintBorder: 'rgba(34,197,94,0.32)',
                icon: <Activity size={13} color="#86EFAC" />,
            };
        }
        if (stabilityPct != null && stabilityPct >= 45) {
            return {
                tintBg: 'rgba(245,158,11,0.14)',
                tintBorder: 'rgba(245,158,11,0.32)',
                icon: <Activity size={13} color="#FCD34D" />,
            };
        }
        return {
            tintBg: 'rgba(239,68,68,0.14)',
            tintBorder: 'rgba(239,68,68,0.3)',
            icon: <Activity size={13} color="#FCA5A5" />,
        };
    }
    if (tileId === 'mood') {
        return {
            tintBg: 'rgba(139,92,246,0.14)',
            tintBorder: 'rgba(139,92,246,0.3)',
            icon: <Smile size={13} color="#C4B5FD" />,
        };
    }
    return {
        tintBg: 'rgba(59,130,246,0.12)',
        tintBorder: 'rgba(59,130,246,0.28)',
        icon: <Hash size={13} color="#93C5FD" />,
    };
}

function StatTile({
    tileId,
    label,
    value,
    detail,
    expanded,
    onToggle,
    tintBg,
    tintBorder,
    icon,
}: {
    tileId: string;
    label: string;
    value: string;
    detail?: string;
    expanded: boolean;
    onToggle: (id: string) => void;
    tintBg: string;
    tintBorder: string;
    icon: React.ReactNode;
}) {
    const hasDetail = Boolean(detail?.trim());
    return (
        <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => hasDetail && onToggle(tileId)}
            style={[
                styles.statTile,
                { backgroundColor: tintBg, borderColor: tintBorder },
                expanded && styles.statTileExpanded,
                !hasDetail && styles.statTileStatic,
            ]}
            disabled={!hasDetail}
        >
            <View style={styles.statTileTop}>
                <View style={styles.statLabelWrap}>
                    <View style={styles.statIconChip}>{icon}</View>
                    <Text style={styles.statLabel}>{label}</Text>
                </View>
                {hasDetail ? (
                    <View style={[styles.tileAffordanceIcon, expanded && styles.tileAffordanceIconExpanded]}>
                        <ChevronDown
                            size={14}
                            color={expanded ? '#BFD2FF' : AURORA.textMuted}
                            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
                        />
                    </View>
                ) : null}
            </View>
            <Text style={styles.statValue} numberOfLines={3}>
                {value}
            </Text>
            {hasDetail && expanded ? (
                <Text style={styles.statDetail}>{detail}</Text>
            ) : null}
        </TouchableOpacity>
    );
}

function CounselorCheckInSummaryPanel({ logs }: { logs: MergedMoodLog[] }) {
    const [expandedTileId, setExpandedTileId] = useState<string | null>(null);
    const toggleTile = (id: string) => {
        setExpandedTileId((prev) => (prev === id ? null : id));
    };

    const tz = deviceTimezone();
    const entries = useMemo(
        () =>
            moodLogsToMoodEntries(
                logs.map((l) => ({
                    ...l,
                    log_date: l.log_date instanceof Date ? l.log_date : new Date((l as { log_date?: Date | string }).log_date as Date),
                })) as (MoodData & { log_date: Date })[],
                DAY_RESET_FALLBACK,
                tz
            ),
        [logs, tz]
    );

    const agg = useMemo(() => aggregateEntriesAsSingleDay(entries), [entries]);
    const stabilityPct = useMemo(() => {
        if (entries.length < 2) return null;
        return moodStabilityScore(entries.map((e) => e.intensity));
    }, [entries]);

    if (entries.length === 0) return null;

    const dominantLabel = getEmotionLabel(agg.dominantMood);
    const avgMoodIntensity = agg.avgIntensity.toFixed(1);
    const stressLabel = normalizeStressLabel(stressCategoryLabelFromFive(agg.avgStress));
    const energyLabel = energyCategoryLabelFromFive(agg.avgEnergy);
    const summaryLine = `${stressLabel.toLowerCase()} stress, ${energyLabel.toLowerCase()}, ${stabilityPct != null ? `${stabilityPct}% stability` : 'stability needs more check-ins'}.`;

    return (
        <View style={styles.summaryPanel}>
            <Text style={styles.summaryFootnote}>
                Built from the same self-report scales as the student app (1–5 stress & energy). Not a clinical assessment.
            </Text>
            <Text style={styles.summarySubnote}>
                Self-reported trends for quick support triage.
            </Text>
            <Text style={styles.summaryContextLine}>
                Summary: {summaryLine}
            </Text>
            <Text style={styles.summaryContextLineMuted}>
                Based on {agg.entryCount} self-reported check-in{agg.entryCount === 1 ? '' : 's'} in the last {COUNSELOR_CHECKIN_WINDOW_DAYS} days.
            </Text>
            <View style={styles.statGrid}>
                <StatTile
                    tileId="stress"
                    label="Average stress"
                    value={stressLabel}
                    detail={`Average score ${agg.avgStress.toFixed(1)} on a 1–5 scale (same bands as the student app). Lower is calmer; higher is more stressed.`}
                    expanded={expandedTileId === 'stress'}
                    onToggle={toggleTile}
                    {...tileVisuals('stress', stressLabel, agg.avgStress, agg.avgEnergy, stabilityPct)}
                />
                <StatTile
                    tileId="energy"
                    label="Average energy"
                    value={energyLabel}
                    detail={`Average score ${agg.avgEnergy.toFixed(1)} on a 1–5 scale (same bands as the student app). Lower is more tired; higher is more energized.`}
                    expanded={expandedTileId === 'energy'}
                    onToggle={toggleTile}
                    {...tileVisuals('energy', energyLabel, agg.avgStress, agg.avgEnergy, stabilityPct)}
                />
                <StatTile
                    tileId="mood"
                    label="Dominant mood"
                    value={dominantLabel}
                    detail={`Strongest emotion tag across check-ins. Average mood intensity ${avgMoodIntensity} / 10.`}
                    expanded={expandedTileId === 'mood'}
                    onToggle={toggleTile}
                    {...tileVisuals('mood', dominantLabel, agg.avgStress, agg.avgEnergy, stabilityPct)}
                />
                <StatTile
                    tileId="checkins"
                    label="Check-ins"
                    value={String(agg.entryCount)}
                    detail={`Total self-reported check-ins in Aurora for the last ${COUNSELOR_CHECKIN_WINDOW_DAYS} days.`}
                    expanded={expandedTileId === 'checkins'}
                    onToggle={toggleTile}
                    {...tileVisuals('checkins', String(agg.entryCount), agg.avgStress, agg.avgEnergy, stabilityPct)}
                />
                <StatTile
                    tileId="stability"
                    label="Mood stability"
                    value={stabilityPct != null ? `${stabilityPct}%` : '—'}
                    detail={
                        stabilityPct != null
                            ? `${stabilityCaption(stabilityPct)} Based on how much mood intensity varied between check-ins (same idea as the student analytics card).`
                            : 'Stability needs at least two check-ins in this window so Aurora can compare intensity between entries.'
                    }
                    expanded={expandedTileId === 'stability'}
                    onToggle={toggleTile}
                    {...tileVisuals('stability', stabilityPct != null ? `${stabilityPct}%` : '—', agg.avgStress, agg.avgEnergy, stabilityPct)}
                />
            </View>
        </View>
    );
}

interface StudentEntry {
    id: string;
    full_name: string;
    department?: string;
    program?: string;
    year_level?: string;
    avatar_url?: string;
}

interface StudentProfileModalProps {
    visible: boolean;
    student: StudentEntry | null;
    onClose: () => void;
    counselorId?: string;
    counselorName?: string;
    counselorAvatar?: string;
    signalRiskLevel?: CounselorSignalPill;
}

function conversationStyleFromSignal(
    sharingOn: boolean,
    level?: CounselorSignalPill,
): { isAlerted: boolean; borderColor?: string } {
    if (!sharingOn || !level || level === 'sharing_off' || level === 'no_checkins' || level === 'typical_self_report') {
        return { isAlerted: false, borderColor: undefined };
    }
    if (level === 'higher_self_report') return { isAlerted: true, borderColor: AURORA.red };
    if (level === 'moderate_self_report') return { isAlerted: false, borderColor: AURORA.orange };
    return { isAlerted: false, borderColor: undefined };
}

export default function StudentProfileModal({
    visible,
    student,
    onClose,
    counselorId,
    counselorName,
    counselorAvatar,
    signalRiskLevel,
}: StudentProfileModalProps) {
    const [rawLogs, setRawLogs] = useState<MergedMoodLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [sharingEnabled, setSharingEnabled] = useState(false);
    const [inviteBusy, setInviteBusy] = useState(false);
    const { height: windowHeight } = useWindowDimensions();

    /** Matches ~footnote + 2×2 stat grid + full-width tile so the sheet height does not jump when fetch completes. */
    const chartLoadingMinHeight = Math.round(
        Math.min(460, Math.max(320, windowHeight * 0.44)),
    );

    useEffect(() => {
        if (!visible || !student) return;

        setLoading(true);
        setRawLogs([]);
        fetchStudentCheckInContextForCounselor(student.id)
            .then(({ sharingEnabled: on, logs }) => {
                setSharingEnabled(on);
                if (!on) {
                    setRawLogs([]);
                    return;
                }
                const normalized = (logs || []).map((l: MergedMoodLog) => ({
                    ...l,
                    log_date: l.log_date instanceof Date ? l.log_date : new Date(l.log_date as unknown as string),
                }));
                setRawLogs(normalized);
            })
            .catch(() => {
                setSharingEnabled(false);
                setRawLogs([]);
            })
            .finally(() => setLoading(false));
    }, [visible, student?.id]);

    if (!student) return null;

    const programLine = formatCounselorStudentSubtitle({
        department: student.department,
        program: student.program,
        year_level: student.year_level,
    }) || 'CCS';

    const handleInviteToSession = async () => {
        if (!counselorId) {
            Alert.alert('Sign in required', 'Please sign in again as a counselor to send an invite.');
            return;
        }
        const { isAlerted, borderColor } = conversationStyleFromSignal(sharingEnabled, signalRiskLevel);
        setInviteBusy(true);
        try {
            await firestoreService.addConversation(
                counselorId,
                {
                    id: student.id,
                    name: student.full_name ?? 'Student',
                    avatar: student.avatar_url ?? '',
                    program: programLine,
                    isAlerted,
                    borderColor,
                },
                { name: counselorName || 'Counselor', avatar: counselorAvatar },
            );
            onClose();
            router.push('/(counselor)/messages');
        } catch (e) {
            console.error('Invite to session failed:', e);
            Alert.alert('Could not start chat', 'Please try again in a moment.');
        } finally {
            setInviteBusy(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.sheet}>
                    <View style={styles.handleBar} />

                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 8 }}
                    >
                        <View style={styles.header}>
                            <View style={styles.studentInfo}>
                                <LetterAvatar name={student.full_name ?? 'Student'} size={56} avatarUrl={student.avatar_url} />
                                <View style={styles.studentInfoText}>
                                    <Text style={styles.name} numberOfLines={2}>
                                        {student.full_name}
                                    </Text>
                                    <Text style={styles.program} numberOfLines={3} ellipsizeMode="tail">
                                        {programLine}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                                <X size={24} color={AURORA.textSec} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.chartSection}>
                            <Text style={styles.chartTitle}>
                                Check-in summary · last {COUNSELOR_CHECKIN_WINDOW_DAYS} days
                            </Text>
                            {loading ? (
                                <View
                                    style={[
                                        styles.chartBox,
                                        styles.loadingBox,
                                        { minHeight: chartLoadingMinHeight },
                                    ]}
                                >
                                    <ActivityIndicator color={AURORA.blue} size="large" />
                                </View>
                            ) : !sharingEnabled ? (
                                <View style={[styles.chartBox, styles.messageBox]}>
                                    <Text style={styles.emptyText}>
                                        This student has not enabled check-in sharing. Aurora does not show mood summaries without consent.
                                    </Text>
                                </View>
                            ) : rawLogs.length === 0 ? (
                                <View style={[styles.chartBox, styles.messageBox]}>
                                    <Text style={styles.emptyText}>
                                        {`Sharing is on, but there are no check-ins in Aurora for the last ${COUNSELOR_CHECKIN_WINDOW_DAYS} days — so there is nothing to summarize yet.`}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.chartBox}>
                                    <CounselorCheckInSummaryPanel logs={rawLogs} />
                                </View>
                            )}
                        </View>

                        <Text style={styles.inviteHint}>
                            {sharingEnabled
                                ? 'Figures above are self-reported summaries only — not a diagnosis.\nUse messages to coordinate a session respectfully.'
                                : 'This student has not shared recent check-ins in Aurora. You can still invite them to a session: sharing only controls summaries here, not whether you may reach out through the app.'}
                        </Text>
                    </ScrollView>

                    <TouchableOpacity
                        onPress={() => { void handleInviteToSession(); }}
                        disabled={inviteBusy}
                        style={[styles.inviteButton, { opacity: inviteBusy ? 0.7 : 1 }]}
                    >
                        {inviteBusy ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                                Invite to Session
                            </Text>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.inviteSubtext}>Opens chat to coordinate schedule.</Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#0c1028',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 20,
        paddingBottom: 34,
        maxHeight: '92%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
        elevation: 28,
    },
    handleBar: {
        width: 44,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    studentInfo: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    studentInfoText: {
        flex: 1,
        minWidth: 0,
    },
    name: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    program: {
        color: AURORA.textSec,
        fontSize: 12,
        marginTop: 2,
    },
    closeBtn: {
        flexShrink: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    chartSection: {
        marginBottom: 8,
    },
    chartTitle: {
        color: '#E2E8F0',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.4,
        marginBottom: 12,
    },
    chartBox: {
        backgroundColor: 'rgba(15,23,42,0.85)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        padding: 14,
    },
    loadingBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    messageBox: {
        minHeight: 100,
        paddingVertical: 16,
        justifyContent: 'center',
    },
    emptyText: {
        color: AURORA.textMuted,
        fontSize: 14,
        lineHeight: 20,
    },
    inviteHint: {
        color: 'rgba(148,163,184,0.95)',
        fontSize: 12,
        lineHeight: 18,
        marginTop: 16,
        marginBottom: 4,
    },
    inviteButton: {
        marginTop: 14,
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        backgroundColor: AURORA.blue,
        shadowColor: AURORA.blue,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    summaryPanel: {
        gap: 10,
    },
    summaryFootnote: {
        color: 'rgba(148,163,184,0.9)',
        fontSize: 11,
        lineHeight: 17,
        marginBottom: 6,
    },
    summarySubnote: {
        color: 'rgba(170,186,224,0.88)',
        fontSize: 11,
        lineHeight: 16,
        marginBottom: 4,
    },
    summaryContextLine: {
        color: '#D2DDF8',
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 2,
    },
    summaryContextLineMuted: {
        color: 'rgba(170,186,224,0.82)',
        fontSize: 11,
        lineHeight: 16,
        marginBottom: 10,
    },
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statTile: {
        width: '47%',
        flexGrow: 1,
        minWidth: 140,
        minHeight: 126,
        backgroundColor: 'rgba(30,41,59,0.65)',
        borderRadius: 16,
        padding: 14,
        paddingBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    statTileExpanded: {
        borderColor: 'rgba(45,107,255,0.45)',
        backgroundColor: 'rgba(30,58,138,0.25)',
    },
    statTileStatic: {
        opacity: 0.95,
    },
    statTileTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statLabelWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        minWidth: 0,
    },
    statIconChip: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    tileAffordanceIcon: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(148,163,184,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.18)',
    },
    tileAffordanceIconExpanded: {
        backgroundColor: 'rgba(45,107,255,0.18)',
        borderColor: 'rgba(45,107,255,0.4)',
    },
    statLabel: {
        color: 'rgba(148,163,184,0.95)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        textTransform: 'uppercase',
        flex: 1,
        paddingRight: 6,
    },
    statValue: {
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
        lineHeight: 23,
    },
    inviteSubtext: {
        color: 'rgba(170,186,224,0.85)',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 7,
    },
    statDetail: {
        color: 'rgba(226,232,240,0.92)',
        fontSize: 12,
        lineHeight: 18,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
});
