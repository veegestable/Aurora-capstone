/**
 * SessionHistoryDetailModal - Counselor view of session details
 * Shows session info, status, date/time. Can open attendance modal when applicable.
 */

import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Calendar, Clock, FileText, AlertTriangle, X, Hash } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';
import { LetterAvatar } from '../common/LetterAvatar';
import type { SessionHistoryBadge } from '../../utils/sessionScheduling';
import { formatCounselorStudentSubtitle } from '../../constants/ccs-student-programs';

const BADGE_CONFIG: Record<SessionHistoryBadge, { label: string; bg: string; text: string }> = {
    pending: { label: 'PENDING', bg: 'rgba(45,107,255,0.2)', text: AURORA.blue },
    today: { label: 'TODAY', bg: 'rgba(34,197,94,0.22)', text: '#86efac' },
    completed: { label: 'COMPLETED', bg: 'rgba(34,197,94,0.2)', text: AURORA.green },
    missed: { label: 'MISSED', bg: 'rgba(239,68,68,0.2)', text: AURORA.red },
    cancelled: { label: 'CANCELLED', bg: 'rgba(75,86,147,0.3)', text: AURORA.textMuted },
    expired: { label: 'EXPIRED', bg: 'rgba(75,86,147,0.35)', text: AURORA.textMuted },
    reschedule: { label: 'RESCHEDULE', bg: 'rgba(249,115,22,0.2)', text: AURORA.orange },
};

export interface SessionHistoryDetailData {
    id: string;
    studentId: string;
    studentName: string;
    studentAvatar?: string;
    studentDepartment?: string;
    studentProgram?: string;
    studentYear?: string;
    status: string;
    /** From `sessions.sessionHistoryBadge` — counselor pill for list/detail */
    sessionHistoryBadge: SessionHistoryBadge;
    finalSlot?: { date: string; time: string } | null;
    confirmedSlot: { date: string; time: string } | null;
    proposedSlots: Array<{ date: string; time: string }>;
    preferredTimeFromStudent?: string;
    /** Student note from session request (`sessions` document) */
    studentRequestNote?: string;
    attendanceNote?: string;
    cancelReason?: string;
    dateDisplay?: string;
    timeDisplay?: string;
}

interface SessionHistoryDetailModalProps {
    visible: boolean;
    data: SessionHistoryDetailData | null;
    canMarkAttendance?: boolean;
    onClose: () => void;
    onMarkAttendance?: () => void;
    onViewNote?: () => void;
}

export default function SessionHistoryDetailModal({
    visible,
    data,
    canMarkAttendance,
    onClose,
    onMarkAttendance,
    onViewNote,
}: SessionHistoryDetailModalProps) {
    if (!visible) return null;

    const badgeConfig = data ? BADGE_CONFIG[data.sessionHistoryBadge] : null;
    const dateStr = data?.dateDisplay ?? data?.finalSlot?.date ?? data?.confirmedSlot?.date ?? data?.proposedSlots?.[0]?.date ?? '-';
    const timeStr = data?.timeDisplay ?? data?.finalSlot?.time ?? data?.confirmedSlot?.time ?? data?.proposedSlots?.[0]?.time ?? data?.preferredTimeFromStudent ?? '-';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={styles.sheet}>
                    <View style={styles.handleBar} />
                    <View style={styles.header}>
                        <Text style={styles.title}>Session details</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={12}>
                            <X size={22} color={AURORA.textSec} />
                        </TouchableOpacity>
                    </View>

                    {data ? (
                        <ScrollView
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.studentRow}>
                                <LetterAvatar name={data.studentName} size={56} avatarUrl={data.studentAvatar} />
                                <View style={styles.studentInfo}>
                                    <Text style={styles.studentName}>{data.studentName}</Text>
                                    <Text style={styles.studentMeta}>
                                        {formatCounselorStudentSubtitle({
                                            department: data.studentDepartment,
                                            program: data.studentProgram,
                                            year_level: data.studentYear,
                                        }) || 'Student'}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.statusPill, badgeConfig && { backgroundColor: badgeConfig.bg }]}>
                                <Text style={[styles.statusText, badgeConfig && { color: badgeConfig.text }]}>
                                    {badgeConfig?.label ?? data.sessionHistoryBadge}
                                </Text>
                            </View>

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Calendar size={18} color={AURORA.blue} />
                                    <Text style={styles.sectionLabel}>Date</Text>
                                </View>
                                <Text style={styles.sectionValue}>{dateStr}</Text>
                            </View>

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Clock size={18} color={AURORA.blue} />
                                    <Text style={styles.sectionLabel}>Time</Text>
                                </View>
                                <Text style={styles.sectionValue}>{timeStr}</Text>
                            </View>

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Hash size={18} color={AURORA.textSec} />
                                    <Text style={styles.sectionLabel}>Session ID</Text>
                                </View>
                                <Text style={[styles.sectionValue, styles.monoValue]} selectable>
                                    {data.id}
                                </Text>
                                <Text style={styles.hintText}>
                                    Canonical status and schedule live on this document in the{' '}
                                    <Text style={styles.monoHint}>sessions</Text> collection (not on chat messages).
                                </Text>
                            </View>

                            {data.studentRequestNote ? (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <FileText size={18} color={AURORA.blue} />
                                        <Text style={styles.sectionLabel}>Description</Text>
                                    </View>
                                    <Text style={styles.sectionValue}>{data.studentRequestNote}</Text>
                                </View>
                            ) : null}

                            {data.preferredTimeFromStudent && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <FileText size={18} color={AURORA.blue} />
                                        <Text style={styles.sectionLabel}>Student requested</Text>
                                    </View>
                                    <Text style={styles.sectionValue}>{data.preferredTimeFromStudent}</Text>
                                </View>
                            )}

                            {data.status === 'missed' && (
                                <View style={[styles.section, styles.alertSection]}>
                                    <AlertTriangle size={18} color={AURORA.red} />
                                    <Text style={styles.alertText}>Student did not show up</Text>
                                </View>
                            )}

                            {data.status === 'completed' && data.attendanceNote && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <FileText size={18} color={AURORA.green} />
                                        <Text style={styles.sectionLabel}>Note</Text>
                                    </View>
                                    <Text style={styles.noteValue}>{data.attendanceNote}</Text>
                                </View>
                            )}

                            {canMarkAttendance && onMarkAttendance && (
                                <TouchableOpacity
                                    style={styles.primaryBtn}
                                    onPress={onMarkAttendance}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.primaryBtnText}>Mark attendance</Text>
                                </TouchableOpacity>
                            )}

                            {data.status === 'completed' && onViewNote && (
                                <TouchableOpacity
                                    style={styles.primaryBtn}
                                    onPress={onViewNote}
                                    activeOpacity={0.85}
                                >
                                    <FileText size={18} color="#FFFFFF" />
                                    <Text style={styles.primaryBtnText}>View note</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    ) : (
                        <Text style={styles.empty}>No details available.</Text>
                    )}

                    <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={styles.closeBtnText}>Close</Text>
                    </TouchableOpacity>
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
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: {
        backgroundColor: AURORA.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: AURORA.border,
        paddingHorizontal: 20,
        paddingBottom: 34,
        maxHeight: '85%',
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: AURORA.border,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    scroll: {
        maxHeight: 400,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    studentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 14,
    },
    studentInfo: { flex: 1 },
    studentName: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    studentMeta: {
        color: AURORA.textSec,
        fontSize: 13,
        marginTop: 2,
    },
    statusPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    section: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    sectionLabel: {
        color: AURORA.textMuted,
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    sectionValue: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '500',
        paddingLeft: 26,
    },
    monoValue: {
        fontSize: 13,
        fontWeight: '400',
    },
    hintText: {
        color: AURORA.textMuted,
        fontSize: 11,
        lineHeight: 16,
        paddingLeft: 26,
        marginTop: 6,
    },
    monoHint: {
        fontSize: 11,
        color: AURORA.textSec,
    },
    noteValue: {
        color: AURORA.textSec,
        fontSize: 14,
        lineHeight: 22,
        paddingLeft: 26,
    },
    alertSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(239,68,68,0.1)',
        padding: 12,
        borderRadius: 12,
    },
    alertText: {
        color: AURORA.red,
        fontSize: 14,
        fontWeight: '600',
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: AURORA.blue,
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 12,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    empty: {
        color: AURORA.textSec,
        fontSize: 14,
        marginBottom: 20,
    },
    closeBtn: {
        backgroundColor: AURORA.cardDark,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 12,
        borderWidth: 1,
        borderColor: AURORA.border,
    },
    closeBtnText: {
        color: AURORA.textSec,
        fontSize: 16,
        fontWeight: '600',
    },
});
