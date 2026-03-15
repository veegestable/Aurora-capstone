/**
 * SessionRequestCard - Shows when student has sent a session request (e.g. in chat).
 * Layout and styling aligned with ScheduleInviteCard for consistent, readable chat cards.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, Clock, FileText, ChevronRight, Pencil } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';

export interface SessionRequestData {
    id: string;
    preferredTime: string;
    note: string;
    status: 'pending' | 'approved' | 'declined';
}

interface SessionRequestCardProps {
    data: SessionRequestData;
    isFromMe?: boolean;
    onViewDetails?: () => void;
    onEdit?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: 'Pending review', bg: 'rgba(254,189,3,0.2)', text: AURORA.amber },
    approved: { label: 'Approved', bg: 'rgba(34,197,94,0.2)', text: AURORA.green },
    declined: { label: 'Declined', bg: 'rgba(239,68,68,0.2)', text: AURORA.red },
};

export default function SessionRequestCard({
    data,
    isFromMe = true,
    onViewDetails,
    onEdit,
}: SessionRequestCardProps) {
    const statusConfig = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.pending;

    return (
        <View style={styles.wrapper}>
            <View style={[styles.card, isFromMe ? styles.cardTailRight : styles.cardTailLeft]}>
                <View style={styles.header}>
                    <View style={styles.iconWrap}>
                        <Calendar size={20} color={AURORA.blue} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Session request sent</Text>
                        <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
                            <Text style={[styles.statusText, { color: statusConfig.text }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.row}>
                    <Clock size={14} color={AURORA.textSec} style={styles.rowIcon} />
                    <Text style={styles.rowLabel}>Preferred time</Text>
                    <Text style={styles.rowValue} numberOfLines={1}>{data.preferredTime}</Text>
                </View>

                <View style={styles.noteBlock}>
                    <FileText size={14} color={AURORA.textSec} style={styles.rowIcon} />
                    <View style={styles.noteContent}>
                        <Text style={styles.rowLabel}>Your note</Text>
                        <Text style={styles.noteText} numberOfLines={3}>
                            {data.note || 'No note added'}
                        </Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={onViewDetails}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryBtnText}>View details</Text>
                        <ChevronRight size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={onEdit}
                        activeOpacity={0.85}
                    >
                        <Pencil size={16} color={AURORA.blue} />
                        <Text style={styles.secondaryBtnText}>Edit</Text>
                    </TouchableOpacity>
                </View>
            </View>
            {/* Bubble tail */}
            <View
                style={[
                    styles.tail,
                    isFromMe ? styles.tailRight : styles.tailLeft,
                ]}
            />
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
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(45,107,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
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
        width: 90,
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
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: AURORA.border,
        backgroundColor: AURORA.card,
    },
    secondaryBtnText: {
        color: AURORA.textSec,
        fontSize: 14,
        fontWeight: '600',
    },
});
