/**
 * SessionRequestReceivedCard - Counselor receives student session request
 * Shows NEW SESSION REQUEST with Accept Request + Propose New Time
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, FileText, Check, Clock } from 'lucide-react-native';
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
    const status = data.status;
    const isExpired = data.isExpired ?? false;
    const isNeedsRescheduling = status === 'needs_rescheduling';
    const isAccepted = ['confirmed', 'completed', 'missed', 'rescheduled'].includes(status);
    const canAct =
        !isExpired &&
        !['cancelled'].includes(status) &&
        ['pending', 'requested', 'needs_rescheduling'].includes(status);

    const statusPillConfig: { label: string; bg: string; text: string } = (() => {
        if (isExpired) return { label: 'EXPIRED', bg: 'rgba(255,255,255,0.08)', text: AURORA.textMuted };
        if (status === 'cancelled') return { label: 'CANCELLED', bg: 'rgba(239,68,68,0.2)', text: AURORA.red };
        if (status === 'needs_rescheduling') return { label: 'NEEDS RESCHEDULING', bg: 'rgba(245,158,11,0.2)', text: AURORA.orange };
        if (isAccepted) return { label: 'ACCEPTED', bg: 'rgba(34,197,94,0.2)', text: AURORA.green };
        if (status === 'pending') return { label: 'PENDING REVIEW', bg: 'rgba(254,189,3,0.2)', text: AURORA.amber };
        // Firestore uses `requested` for student-initiated session requests.
        return { label: 'NEW SESSION REQUEST', bg: 'rgba(45,107,255,0.18)', text: AURORA.blue };
    })();

    const showAccept = !!data.preferredTime && !!onAccept && !isNeedsRescheduling && canAct;
    const showPropose = !!onProposeNewTime && canAct;

    return (
        <View style={styles.wrapper}>
            <View style={[styles.card, isFromMe ? styles.cardTailRight : styles.cardTailLeft]}>
                <View style={styles.header}>
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
                                <Check size={18} color="#FFFFFF" />
                                <Text style={styles.primaryBtnText}>Accept Request</Text>
                            </TouchableOpacity>
                        ) : null}

                        {showPropose ? (
                            <TouchableOpacity
                                style={[styles.proposeBtn, !showAccept && styles.proposeBtnFull]}
                                onPress={onProposeNewTime}
                                activeOpacity={0.85}
                            >
                                <Clock size={18} color={AURORA.blue} />
                                <Text style={styles.proposeBtnText}>
                                    {isNeedsRescheduling ? 'Reschedule' : 'Propose New Time'}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                ) : null}
            </View>

            {/* Bubble tail */}
            <View style={[styles.tail, isFromMe ? styles.tailRight : styles.tailLeft]} />
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
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
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
        gap: 10,
    },
    primaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AURORA.blue,
        borderRadius: 10,
        paddingVertical: 12,
        gap: 6,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    proposeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
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
        color: AURORA.blue,
        fontSize: 14,
        fontWeight: '700',
    },
});
