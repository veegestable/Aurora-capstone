/**
 * SessionCard - Session confirmed/invite card shown in chat
 * Gradient card with session details, View Details & Reschedule buttons
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin, X, FileText, Clock, Hash, User } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';
import { isSessionScheduledTimeReached } from '../../utils/dateHelpers';

/** Same pill pattern as `SessionRequestDetailsModal` (student). */
function modalSessionStatusPill(internalLabel: string): { label: string; bg: string; text: string } {
    switch (internalLabel) {
        case 'ACCEPTED':
            return { label: 'Accepted', bg: 'rgba(34,197,94,0.2)', text: AURORA.green };
        case 'COMPLETED':
            return { label: 'Completed', bg: 'rgba(59,130,246,0.2)', text: AURORA.blueLight };
        case 'MISSED':
            return { label: 'Missed', bg: 'rgba(249,115,22,0.2)', text: AURORA.orange };
        case 'CANCELLED':
            return { label: 'Cancelled', bg: 'rgba(239,68,68,0.2)', text: AURORA.red };
        default:
            return {
                label: 'Awaiting student',
                bg: 'rgba(254,189,3,0.2)',
                text: AURORA.amber,
            };
    }
}

export interface SessionCardData {
    id: string;
    type: 'invite' | 'confirmed';
    title: string;
    counselorName?: string;
    date: string;
    time: string;
    location?: string;
    /** From `sessions.status` when messages are loaded — drives Accepted / hide Reschedule. */
    sessionStatus?: string;
    /** From `sessions.finalSlot` when student or counselor confirmed a time. */
    agreedSlot?: { date: string; time: string };
    /** Counselor note on the invite (stored on `sessionData`). */
    note?: string;
    /** Proposed time options (stored on `sessionData`). */
    timeSlots?: { date: string; time: string }[];
    /** Firestore message `linkedSessionId` — fallback if `id` is missing on older invites. */
    linkedSessionId?: string;
    /** Legacy alias for `sessions/{id}` on some payloads. */
    sessionId?: string;
}

interface SessionCardProps {
    data: SessionCardData;
    isFromMe?: boolean;
    /** Optional hook when the user opens the details modal (e.g. analytics). */
    onViewDetails?: () => void;
    onReschedule?: () => void;
    /** When the scheduled time has passed, show “Mark attendance” in the modal. */
    onMarkAttendance?: () => void;
}

export default function SessionCard({ data, isFromMe, onViewDetails, onReschedule, onMarkAttendance }: SessionCardProps) {
    const [detailOpen, setDetailOpen] = useState(false);
    const st = data.sessionStatus;
    const legacyConfirmed = data.type === 'confirmed';
    const hasAgreedTime = !!(data.agreedSlot?.date && data.agreedSlot?.time);

    const statusLabel = (() => {
        if (st === 'confirmed' || legacyConfirmed || hasAgreedTime) return 'ACCEPTED';
        if (st === 'completed') return 'COMPLETED';
        if (st === 'missed') return 'MISSED';
        if (st === 'cancelled') return 'CANCELLED';
        return 'SESSION INVITE';
    })();

    // Pending invite: always show Reschedule next to View Details (handler may no-op if id missing upstream).
    const showReschedule = statusLabel === 'SESSION INVITE';

    const displayDate = data.agreedSlot?.date ?? data.date;
    const displayTime = data.agreedSlot?.time ?? data.time;

    const openDetails = () => {
        setDetailOpen(true);
        onViewDetails?.();
    };

    const canMarkAttendance =
        !!onMarkAttendance &&
        !!data.id &&
        !String(data.id).startsWith('session_') &&
        isSessionScheduledTimeReached({ date: displayDate, time: displayTime });

    const handleMarkAttendancePress = () => {
        setDetailOpen(false);
        onMarkAttendance?.();
    };

    const statusPill = modalSessionStatusPill(statusLabel);
    const dateTimeLine = `${displayDate} at ${displayTime}`;

    return (
        <View style={styles.wrapper}>
            <LinearGradient
                colors={[AURORA.blue, AURORA.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>{statusLabel}</Text>
                    <Calendar size={14} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={styles.title}>{data.title}</Text>
                {data.counselorName && (
                    <Text style={styles.counselor}>with {data.counselorName}</Text>
                )}
                <View style={styles.details}>
                    <View style={styles.detailRow}>
                        <Calendar size={14} color="rgba(255,255,255,0.85)" />
                        <Text style={styles.detailText}>
                            {displayDate} • {displayTime}
                        </Text>
                    </View>
                    {data.location && (
                        <View style={styles.detailRow}>
                            <MapPin size={14} color="rgba(255,255,255,0.85)" />
                            <Text style={styles.detailText}>{data.location}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.primaryBtn, !showReschedule && styles.primaryBtnSingle]}
                        onPress={openDetails}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryBtnText}>View Details</Text>
                    </TouchableOpacity>
                    {showReschedule && (
                        <TouchableOpacity
                            style={[styles.secondaryBtn, !onReschedule && styles.secondaryBtnDisabled]}
                            onPress={() => onReschedule?.()}
                            disabled={!onReschedule}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.secondaryBtnText}>Reschedule</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            <Modal
                visible={detailOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setDetailOpen(false)}
            >
                <View style={styles.sheetOverlay}>
                    <TouchableOpacity
                        style={styles.sheetBackdrop}
                        activeOpacity={1}
                        onPress={() => setDetailOpen(false)}
                        accessibilityLabel="Dismiss"
                    />
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Session details</Text>
                            <TouchableOpacity
                                onPress={() => setDetailOpen(false)}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                accessibilityLabel="Close"
                            >
                                <X size={24} color={AURORA.textSec} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.sheetScroll}
                            contentContainerStyle={styles.sheetScrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
                                <Text style={[styles.statusPillText, { color: statusPill.text }]}>
                                    {statusPill.label}
                                </Text>
                            </View>

                            <View style={styles.sheetSection}>
                                <View style={styles.sheetSectionHeader}>
                                    <Calendar size={18} color={AURORA.blue} />
                                    <Text style={styles.sheetSectionLabel}>Session title</Text>
                                </View>
                                <Text style={styles.sheetSectionValue}>{data.title}</Text>
                            </View>

                            {data.counselorName ? (
                                <View style={styles.sheetSection}>
                                    <View style={styles.sheetSectionHeader}>
                                        <User size={18} color={AURORA.blue} />
                                        <Text style={styles.sheetSectionLabel}>Counselor</Text>
                                    </View>
                                    <Text style={styles.sheetSectionValue}>{data.counselorName}</Text>
                                </View>
                            ) : null}

                            <View style={styles.sheetSection}>
                                <View style={styles.sheetSectionHeader}>
                                    <Clock size={18} color={AURORA.blue} />
                                    <Text style={styles.sheetSectionLabel}>Date & time</Text>
                                </View>
                                <Text style={styles.sheetSectionValue}>{dateTimeLine}</Text>
                            </View>

                            {data.location ? (
                                <View style={styles.sheetSection}>
                                    <View style={styles.sheetSectionHeader}>
                                        <MapPin size={18} color={AURORA.blue} />
                                        <Text style={styles.sheetSectionLabel}>Location</Text>
                                    </View>
                                    <Text style={styles.sheetSectionValue}>{data.location}</Text>
                                </View>
                            ) : null}

                            {data.timeSlots && data.timeSlots.length > 0 ? (
                                <View style={styles.sheetSection}>
                                    <View style={styles.sheetSectionHeader}>
                                        <Calendar size={18} color={AURORA.blue} />
                                        <Text style={styles.sheetSectionLabel}>Proposed times</Text>
                                    </View>
                                    {data.timeSlots.map((slot, i) => (
                                        <Text key={i} style={styles.sheetSlotLine}>
                                            {slot.date} — {slot.time}
                                        </Text>
                                    ))}
                                </View>
                            ) : null}

                            <View style={styles.sheetSection}>
                                <View style={styles.sheetSectionHeader}>
                                    <FileText size={18} color={AURORA.blue} />
                                    <Text style={styles.sheetSectionLabel}>Note</Text>
                                </View>
                                <Text style={styles.sheetNoteValue}>
                                    {data.note?.trim() ? data.note : 'No note added'}
                                </Text>
                            </View>

                            <View style={styles.sheetSection}>
                                <View style={styles.sheetSectionHeader}>
                                    <Hash size={18} color={AURORA.blue} />
                                    <Text style={styles.sheetSectionLabel}>Session ID</Text>
                                </View>
                                <Text style={styles.sheetIdValue} selectable>
                                    {data.id}
                                </Text>
                            </View>
                        </ScrollView>

                        {canMarkAttendance ? (
                            <TouchableOpacity
                                style={styles.sheetAttendanceBtn}
                                onPress={handleMarkAttendancePress}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.sheetAttendanceBtnText}>Mark attendance</Text>
                            </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                            style={styles.sheetCloseBtn}
                            onPress={() => setDetailOpen(false)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.sheetCloseBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        maxWidth: 280,
        borderRadius: 16,
        overflow: 'hidden',
    },
    gradient: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statusLabel: {
        color: 'rgba(255,255,255,0.95)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    counselor: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        marginBottom: 12,
    },
    details: {
        gap: 6,
        marginBottom: 14,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    primaryBtn: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    primaryBtnSingle: {
        flexGrow: 1,
        minWidth: '100%',
    },
    primaryBtnText: {
        color: AURORA.blue,
        fontSize: 13,
        fontWeight: '700',
    },
    secondaryBtn: {
        flex: 1,
        backgroundColor: 'transparent',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.9)',
    },
    secondaryBtnDisabled: {
        opacity: 0.45,
    },
    secondaryBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        backgroundColor: AURORA.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: AURORA.border,
        paddingHorizontal: 20,
        paddingBottom: 34,
        maxHeight: '80%',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: AURORA.border,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    sheetScroll: {
        maxHeight: 320,
    },
    sheetScrollContent: {
        paddingBottom: 20,
    },
    statusPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 20,
    },
    statusPillText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    sheetSection: {
        marginBottom: 20,
    },
    sheetSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    sheetSectionLabel: {
        color: AURORA.textMuted,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    sheetSectionValue: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        paddingLeft: 26,
    },
    sheetSlotLine: {
        color: 'rgba(255,255,255,0.92)',
        fontSize: 14,
        lineHeight: 22,
        paddingLeft: 26,
        marginTop: 2,
    },
    sheetNoteValue: {
        color: AURORA.textSec,
        fontSize: 14,
        lineHeight: 22,
        paddingLeft: 26,
    },
    sheetIdValue: {
        color: AURORA.textSec,
        fontSize: 12,
        lineHeight: 18,
        paddingLeft: 26,
    },
    sheetAttendanceBtn: {
        marginBottom: 12,
        backgroundColor: 'rgba(124,58,237,0.35)',
        borderWidth: 1,
        borderColor: 'rgba(167,139,250,0.45)',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    sheetAttendanceBtnText: {
        color: '#e9d5ff',
        fontSize: 15,
        fontWeight: '700',
    },
    sheetCloseBtn: {
        backgroundColor: AURORA.blue,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    sheetCloseBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
