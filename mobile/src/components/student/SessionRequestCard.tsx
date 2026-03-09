/**
 * SessionRequestCard - Shows when student has sent a session request
 * "Session Request Sent" with STATUS: PENDING REVIEW, preferred time, note, View Details & Edit
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, Clock, FileText, Info } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';

export interface SessionRequestData {
    id: string;
    preferredTime: string;  // e.g. "March 12, 2:00 PM"
    note: string;
    status: 'pending' | 'approved' | 'declined';
}

interface SessionRequestCardProps {
    data: SessionRequestData;
    onViewDetails?: () => void;
    onEdit?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
    pending: 'PENDING REVIEW',
    approved: 'APPROVED',
    declined: 'DECLINED',
};

export default function SessionRequestCard({
    data,
    onViewDetails,
    onEdit,
}: SessionRequestCardProps) {
    const statusLabel = STATUS_LABELS[data.status] ?? 'PENDING REVIEW';

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.iconWrap}>
                    <Calendar size={20} color={AURORA.blue} />
                </View>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>Session Request Sent</Text>
                    <TouchableOpacity style={styles.infoBtn} hitSlop={8}>
                        <Info size={16} color={AURORA.textMuted} />
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={styles.status}>STATUS: {statusLabel}</Text>

            <View style={styles.detailRow}>
                <Clock size={14} color={AURORA.textSec} style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Preferred Time:</Text>
                <Text style={styles.detailValue}>{data.preferredTime}</Text>
            </View>

            <View style={styles.noteSection}>
                <FileText size={14} color={AURORA.textSec} style={styles.detailIcon} />
                <View style={styles.noteContent}>
                    <Text style={styles.detailLabel}>Your Note:</Text>
                    <Text style={styles.noteText}>{data.note}</Text>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={onViewDetails}
                    activeOpacity={0.85}
                >
                    <Text style={styles.primaryBtnText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={onEdit}
                    activeOpacity={0.85}
                >
                    <Text style={styles.secondaryBtnText}>Edit</Text>
                </TouchableOpacity>
            </View>
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
        marginBottom: 8,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(45,107,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    titleRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    infoBtn: {
        padding: 4,
    },
    status: {
        color: AURORA.textMuted,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 14,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailIcon: {
        marginRight: 8,
    },
    detailLabel: {
        color: AURORA.textSec,
        fontSize: 12,
        marginRight: 6,
    },
    detailValue: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    noteSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    noteContent: {
        flex: 1,
    },
    noteText: {
        color: AURORA.textSec,
        fontSize: 13,
        fontStyle: 'italic',
        marginTop: 4,
        lineHeight: 18,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    primaryBtn: {
        flex: 1,
        backgroundColor: AURORA.blue,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    secondaryBtn: {
        flex: 1,
        backgroundColor: AURORA.card,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: AURORA.border,
    },
    secondaryBtnText: {
        color: AURORA.textSec,
        fontSize: 14,
        fontWeight: '600',
    },
});
