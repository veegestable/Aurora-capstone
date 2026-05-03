/**
 * SessionRequestReceivedCard - Counselor receives student session request
 * Shows NEW SESSION REQUEST with Accept Request + Propose New Time
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Calendar, FileText, Check, Clock, ChevronRight } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';

export interface SessionRequestReceivedData {
    sessionId: string;
    title?: string;
    preferredTime?: string;
    note: string;
    status: string;
    isExpired?: boolean;
}

interface SessionRequestReceivedCardProps {
    data: SessionRequestReceivedData;
    onAccept?: () => void;
    onProposeNewTime?: () => void;
    isFromMe?: boolean;
}

export default function SessionRequestReceivedCard({
    data,
    onAccept,
    onProposeNewTime,
    isFromMe = false,
}: SessionRequestReceivedCardProps) {
    const [detailOpen, setDetailOpen] = useState(false);
    const status = data.status;
    const isExpired = data.isExpired ?? false;
    const isNeedsRescheduling = status === 'needs_rescheduling';
    const isAccepted = ['confirmed', 'completed', 'missed', 'rescheduled'].includes(status);
    const canAct =
        !isExpired &&
        !['cancelled'].includes(status) &&
        ['pending', 'requested', 'needs_rescheduling'].includes(status);

    const statusPillConfig: { label: string; bg: string; text: string } = (() => {
        if (isExpired)
            return { label: 'Expired request', bg: 'rgba(255,255,255,0.08)', text: AURORA.textMuted };
        if (status === 'cancelled') return { label: 'CANCELLED', bg: 'rgba(239,68,68,0.2)', text: AURORA.red };
        if (status === 'needs_rescheduling') return { label: 'NEEDS RESCHEDULING', bg: 'rgba(245,158,11,0.2)', text: AURORA.orange };
        if (isAccepted) return { label: 'ACCEPTED', bg: 'rgba(34,197,94,0.2)', text: AURORA.green };
        if (status === 'pending') return { label: 'PENDING REVIEW', bg: 'rgba(254,189,3,0.2)', text: AURORA.amber };
        // Firestore uses `requested` for student-initiated session requests.
        return { label: 'NEW SESSION REQUEST', bg: 'rgba(45,107,255,0.18)', text: AURORA.blue };
    })();

    const showAccept = !!data.preferredTime && !!onAccept && !isNeedsRescheduling && canAct;
    const showPropose = !!onProposeNewTime && canAct;

    const hasDetailTrigger =
        !!(data.preferredTime?.trim()) || !!(typeof data.note === 'string' && data.note.trim());

    return (
        <View style={styles.wrapper}>
            <View style={[styles.card, isFromMe ? styles.cardTailRight : styles.cardTailLeft]}>
                <View style={styles.header}>
                    <View style={styles.headerMain}>
                        <View style={styles.iconWrap}>
                            <Calendar size={20} color={AURORA.blue} />
                        </View>

                        <View style={styles.headerText}>
                            <Text style={styles.title}>{data.title || 'Session Request'}</Text>

                            <View style={[styles.statusPill, { backgroundColor: statusPillConfig.bg }]}>
                                <Text style={[styles.statusText, { color: statusPillConfig.text }]}>
                                    {statusPillConfig.label}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {hasDetailTrigger ? (
                        <TouchableOpacity
                            style={styles.detailChevronBtn}
                            onPress={() => setDetailOpen(true)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel="View full session details"
                        >
                            <ChevronRight size={22} color={AURORA.blue} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {data.preferredTime ? (
                    <View style={styles.row}>
                        <Calendar size={14} color={AURORA.textSec} style={styles.rowIcon} />
                        <Text style={styles.rowLabel}>Preferred time</Text>
                        <Text style={[styles.rowValue, isExpired && styles.textMuted]} numberOfLines={1}>
                            {data.preferredTime}
                        </Text>
                    </View>
                ) : null}

                {data.note ? (
                    <View style={styles.noteBlock}>
                        <FileText size={14} color={AURORA.textSec} style={styles.rowIcon} />
                        <View style={styles.noteContent}>
                            <Text style={styles.rowLabel}>Your note</Text>
                            <Text style={[styles.noteText, isExpired && styles.textMuted]} numberOfLines={3}>
                                {data.note}
                            </Text>
                        </View>
                    </View>
                ) : null}

                {(showAccept || showPropose) ? (
                    <View style={styles.actions}>
                        {showAccept ? (
                            <TouchableOpacity style={styles.primaryBtn} onPress={onAccept} activeOpacity={0.85}>
                                <View style={styles.btnRow}>
                                    <Check size={15} color="#FFFFFF" />
                                    <Text style={styles.primaryBtnText} numberOfLines={1}>
                                        Accept
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ) : null}

                        {showPropose ? (
                            <TouchableOpacity
                                style={[styles.proposeBtn, !showAccept && styles.proposeBtnFull]}
                                onPress={onProposeNewTime}
                                activeOpacity={0.85}
                            >
                                <View style={styles.btnRow}>
                                    <Clock size={15} color={AURORA.blue} />
                                    <Text style={styles.proposeBtnText} numberOfLines={2}>
                                        {isNeedsRescheduling ? 'Reschedule' : 'Propose New Time'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                ) : null}
            </View>

            {/* Bubble tail */}
            <View style={[styles.tail, isFromMe ? styles.tailRight : styles.tailLeft]} />

            <Modal
                visible={detailOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setDetailOpen(false)}
            >
                <View style={styles.detailOverlay}>
                    <TouchableOpacity
                        style={styles.detailBackdrop}
                        activeOpacity={1}
                        onPress={() => setDetailOpen(false)}
                    />
                    <View style={styles.detailSheet}>
                        <View style={styles.detailHandleBar} />
                        <Text style={styles.detailSheetTitle}>Session details</Text>
                        <Text style={styles.detailSheetSubtitle}>{data.title || 'Session Request'}</Text>

                        <ScrollView
                            style={styles.detailScroll}
                            contentContainerStyle={styles.detailScrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {data.preferredTime?.trim() ? (
                                <View style={styles.detailSection}>
                                    <View style={styles.detailSectionHeader}>
                                        <Calendar size={16} color={AURORA.blue} />
                                        <Text style={styles.detailSectionLabel}>Preferred time</Text>
                                    </View>
                                    <Text style={styles.detailSectionBody}>{data.preferredTime.trim()}</Text>
                                </View>
                            ) : null}

                            {data.note?.trim() ? (
                                <View style={styles.detailSection}>
                                    <View style={styles.detailSectionHeader}>
                                        <FileText size={16} color={AURORA.blue} />
                                        <Text style={styles.detailSectionLabel}>Your note</Text>
                                    </View>
                                    <Text style={styles.detailSectionBody}>{data.note.trim()}</Text>
                                </View>
                            ) : null}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.detailDoneBtn}
                            onPress={() => setDetailOpen(false)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.detailDoneBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        minWidth: 300,
        width: '100%',
        maxWidth: 340,
        alignSelf: 'flex-start',
        position: 'relative',
    },
    card: {
        backgroundColor: AURORA.cardDark,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AURORA.border,
    },
    cardTailRight: {
        borderBottomRightRadius: 4,
    },
    cardTailLeft: {
        borderBottomLeftRadius: 4,
    },
    tail: {
        position: 'absolute',
        bottom: 10,
        width: 0,
        height: 0,
        borderTopWidth: 6,
        borderBottomWidth: 6,
    },
    tailRight: {
        right: -8,
        borderLeftWidth: 12,
        borderRightWidth: 0,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: AURORA.cardDark,
        borderRightColor: 'transparent',
    },
    tailLeft: {
        left: -8,
        borderLeftWidth: 0,
        borderRightWidth: 12,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
        borderRightColor: AURORA.cardDark,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 8,
    },
    headerMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minWidth: 0,
    },
    detailChevronBtn: {
        paddingVertical: 4,
        paddingLeft: 4,
        marginTop: 2,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(45,107,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    statusPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    textMuted: {
        color: AURORA.textMuted,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    rowIcon: {
        marginRight: 8,
    },
    rowLabel: {
        color: AURORA.textMuted,
        fontSize: 12,
        width: 110,
    },
    rowValue: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
    },
    noteBlock: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    noteContent: {
        flex: 1,
    },
    noteText: {
        color: AURORA.textSec,
        fontSize: 13,
        lineHeight: 20,
        marginTop: 2,
    },
    noteTextMuted: {
        color: AURORA.textMuted,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 10,
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minWidth: 0,
        maxWidth: '100%',
        paddingHorizontal: 8,
    },
    primaryBtn: {
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AURORA.blue,
        borderRadius: 10,
        paddingVertical: 12,
    },
    primaryBtnText: {
        flexShrink: 1,
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    proposeBtn: {
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        paddingVertical: 12,
        borderWidth: 2,
        borderColor: AURORA.blue,
        backgroundColor: AURORA.card,
    },
    proposeBtnFull: {
        flex: 1,
    },
    proposeBtnText: {
        flexShrink: 1,
        color: AURORA.blue,
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    detailOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    detailBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    detailSheet: {
        backgroundColor: AURORA.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: AURORA.border,
        paddingHorizontal: 20,
        paddingBottom: 28,
        maxHeight: '88%',
    },
    detailHandleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: AURORA.border,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    detailSheetTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
    },
    detailSheetSubtitle: {
        color: AURORA.textMuted,
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
    },
    detailScroll: {
        flexGrow: 0,
        maxHeight: 420,
    },
    detailScrollContent: {
        paddingBottom: 8,
    },
    detailSection: {
        backgroundColor: AURORA.cardDark,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: AURORA.border,
    },
    detailSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    detailSectionLabel: {
        color: AURORA.textSec,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    detailSectionBody: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 22,
    },
    detailDoneBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AURORA.blue,
        borderRadius: 12,
        paddingVertical: 14,
        marginTop: 8,
    },
    detailDoneBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
