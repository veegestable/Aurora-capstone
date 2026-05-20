/**
 * SessionRequestCard - Shows when student has sent a session request (e.g. in chat).
 * Layout and styling aligned with ScheduleInviteCard for consistent, readable chat cards.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText as Text } from '../common/AppText';
import { Calendar, Clock, FileText, ChevronRight, Pencil } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';
import {
    getSessionPresentation,
    sessionPresentationColors,
} from '../../utils/sessionPresentation';

export interface SessionRequestData {
    id: string;
    /** sessions/{sessionId} doc id (used for editing/replacing message cards) */
    sessionId?: string;
    preferredTime: string;
    note: string;
    status: string;
    /** Chat message createdAt ms when loaded from Firestore (counselor expiry UX). */
    requestedAtMs?: number;
    /** Live session is pending with proposed slots — counselor offered times (not a new student request). */
    counselorOfferedSlots?: boolean;
}

interface SessionRequestCardProps {
    data: SessionRequestData;
    isFromMe?: boolean;
    /** Open request not accepted within 24h (or preferred time passed) — matches counselor chat UX. */
    isExpired?: boolean;
    onViewDetails?: () => void;
    onEdit?: () => void;
}

export default function SessionRequestCard({
    data,
    isFromMe = true,
    isExpired = false,
    onViewDetails,
    onEdit,
}: SessionRequestCardProps) {
    const offered = !!data.counselorOfferedSlots;
    const presentation = getSessionPresentation({
        status: data.status,
        role: 'student',
        counselorOfferedSlots: offered,
        isExpired,
    });
    const colors = sessionPresentationColors(presentation.variant);

    const cardTitle = offered
        ? 'Your counselor sent new times'
        : isExpired
          ? 'Session request'
          : data.status === 'confirmed'
            ? 'Session scheduled'
            : 'Session request sent';

    const canEdit =
        !isExpired &&
        !offered &&
        !['confirmed', 'completed', 'missed', 'cancelled', 'expired'].includes(
            (data.status ?? '').toLowerCase(),
        );

    return (
        <View style={styles.wrapper}>
            <View style={[styles.card, isFromMe ? styles.cardTailRight : styles.cardTailLeft]}>
                <View style={styles.header}>
                    <View style={styles.iconWrap}>
                        <Calendar size={20} color={AURORA.blue} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={[styles.title, isExpired && styles.textMutedStrong]}>
                            {cardTitle}
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: colors.bg }]}>
                            <Text style={[styles.statusText, { color: colors.text }]}>
                                {presentation.pillLabel}
                            </Text>
                        </View>
                        {presentation.subtitle ? (
                            <Text
                                style={[styles.subtitle, isExpired && styles.textMutedStrong]}
                                numberOfLines={3}
                            >
                                {presentation.subtitle}
                            </Text>
                        ) : null}
                    </View>
                </View>

                <View style={styles.row}>
                    <Clock size={14} color={AURORA.textSec} style={styles.rowIcon} />
                    <View style={styles.rowContent}>
                        <Text style={styles.rowLabel}>
                            {data.status === 'confirmed' ? 'Scheduled time' : 'Preferred time'}
                        </Text>
                        <Text
                            style={[styles.rowValue, isExpired && styles.textMutedStrong]}
                            numberOfLines={2}
                        >
                            {data.preferredTime}
                        </Text>
                    </View>
                </View>

                <View style={styles.noteBlock}>
                    <FileText size={14} color={AURORA.textSec} style={styles.rowIcon} />
                    <View style={styles.noteContent}>
                        <Text style={styles.rowLabel}>Your note</Text>
                        <Text
                            style={[styles.noteText, isExpired && styles.textMutedStrong]}
                            numberOfLines={2}
                        >
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
                        <Text style={styles.primaryBtnText}>
                            {offered ? 'See counselor message' : 'View details'}
                        </Text>
                        <ChevronRight size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    {canEdit && (
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={onEdit}
                            activeOpacity={0.85}
                        >
                            <Pencil size={16} color={AURORA.blue} />
                            <Text style={styles.secondaryBtnText}>Edit</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
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
        alignItems: 'flex-start',
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
    textMutedStrong: {
        color: AURORA.textMuted,
    },
    statusPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginBottom: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    subtitle: {
        color: AURORA.textSec,
        fontSize: 12,
        lineHeight: 17,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    rowIcon: {
        marginRight: 8,
        marginTop: 2,
    },
    rowContent: {
        flex: 1,
    },
    rowLabel: {
        color: AURORA.textMuted,
        fontSize: 12,
    },
    rowValue: {
        color: '#E8EEFF',
        fontSize: 13,
        marginTop: 2,
        lineHeight: 19,
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
        lineHeight: 19,
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
        paddingVertical: 11,
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
        paddingVertical: 11,
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
