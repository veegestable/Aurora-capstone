/**
 * SessionRequestReceivedCard - Counselor receives student session request
 * Shows NEW SESSION REQUEST with Accept Request + Propose New Time
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, MessageSquare, Check, Clock } from 'lucide-react-native';
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
}

export default function SessionRequestReceivedCard({
    data,
    onAccept,
    onProposeNewTime,
}: SessionRequestReceivedCardProps) {
    const isAccepted = ['confirmed', 'completed', 'missed', 'rescheduled'].includes(data.status);
    const isExpired = data.isExpired ?? false;
    const canAct = !isAccepted && !isExpired && !['cancelled'].includes(data.status);

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.iconWrap}>
                    <Calendar size={18} color={AURORA.blue} />
                </View>
                <Text style={[
                    styles.badge,
                    isExpired && styles.badgeExpired,
                    isAccepted && styles.badgeAccepted,
                ]}>
                    {isExpired ? 'EXPIRED' : isAccepted ? 'ACCEPTED' : 'NEW SESSION REQUEST'}
                </Text>
            </View>

            <Text style={styles.title}>{data.title || 'Session Request'}</Text>

            {data.preferredTime && (
                <View style={styles.row}>
                    <Calendar size={14} color={AURORA.textSec} style={styles.rowIcon} />
                    <Text style={[styles.rowText, isExpired && styles.textMuted]}>{data.preferredTime}</Text>
                </View>
            )}

            {data.note && (
                <View style={styles.noteRow}>
                    <MessageSquare size={14} color={AURORA.textSec} style={styles.rowIcon} />
                    <Text style={[styles.noteText, isExpired && styles.textMuted]}>"{data.note}"</Text>
                </View>
            )}

            {isAccepted && (
                <Text style={styles.acceptedNote}>
                    {data.status === 'confirmed' ? 'Session confirmed. See Session History for details.' : ''}
                    {data.status === 'completed' ? 'Session completed.' : ''}
                    {data.status === 'missed' ? 'Student did not show up.' : ''}
                    {data.status === 'rescheduled' ? 'Needs rescheduling.' : ''}
                </Text>
            )}

            {canAct && (
                <View style={styles.actions}>
                    {data.preferredTime && onAccept && (
                        <TouchableOpacity
                            style={styles.acceptBtn}
                            onPress={onAccept}
                            activeOpacity={0.85}
                        >
                            <Check size={18} color="#FFFFFF" />
                            <Text style={styles.acceptBtnText}>Accept Request</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.proposeBtn, !data.preferredTime && styles.proposeBtnFull]}
                        onPress={onProposeNewTime}
                        activeOpacity={0.85}
                    >
                        <Clock size={18} color={AURORA.blue} />
                        <Text style={styles.proposeBtnText}>Propose New Time</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: AURORA.cardDark,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AURORA.border,
        maxWidth: 300,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(45,107,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        color: AURORA.blue,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    badgeExpired: {
        color: AURORA.textMuted,
    },
    badgeAccepted: {
        color: AURORA.green,
    },
    textMuted: {
        color: AURORA.textMuted,
    },
    acceptedNote: {
        color: AURORA.textSec,
        fontSize: 12,
        marginTop: 8,
        fontStyle: 'italic',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    rowIcon: {
        marginRight: 8,
    },
    rowText: {
        color: AURORA.textSec,
        fontSize: 13,
        flex: 1,
    },
    noteRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    noteText: {
        color: AURORA.textSec,
        fontSize: 13,
        fontStyle: 'italic',
        flex: 1,
        lineHeight: 18,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    acceptBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: AURORA.blue,
        borderRadius: 10,
        paddingVertical: 10,
    },
    acceptBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    proposeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'transparent',
        borderRadius: 10,
        paddingVertical: 10,
        borderWidth: 2,
        borderColor: AURORA.blue,
    },
    proposeBtnText: {
        color: AURORA.blue,
        fontSize: 13,
        fontWeight: '700',
    },
    proposeBtnFull: {
        flex: 1,
    },
});
