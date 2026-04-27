/**
 * ScheduleInviteCard - Session scheduling card for students
 * Displays counselor's session invite with selectable time slots
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Platform } from 'react-native';
import { Calendar, Check } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';

export interface TimeSlot {
    date: string;
    time: string;
}

export interface ScheduleInviteData {
    id: string;
    title?: string;
    counselorName?: string;
    note?: string;
    timeSlots?: TimeSlot[];
    date?: string;
    time?: string;
    location?: string;
    /** From `sessions.status` merged in when loading messages — drives confirmed UI. */
    sessionStatus?: string;
    /** From `sessions.finalSlot` when agreed — optional display. */
    agreedSlot?: { date: string; time: string };
}

interface ScheduleInviteCardProps {
    data: ScheduleInviteData;
    senderLabel?: string;
    isFromMe?: boolean;
    /** Disables confirm while parent is saving (avoids double-submit). */
    confirmBusy?: boolean;
    onConfirm?: (selectedSlot: TimeSlot) => void;
}

export default function ScheduleInviteCard({
    data,
    senderLabel = 'Aurora Academic Support',
    isFromMe = false,
    confirmBusy = false,
    onConfirm,
}: ScheduleInviteCardProps) {
    const st = data.sessionStatus;
    const settled =
        st != null && ['confirmed', 'completed', 'missed', 'cancelled'].includes(st);

    const slots = data.timeSlots && data.timeSlots.length > 0
        ? data.timeSlots
        : data.date && data.time
            ? [{ date: data.date, time: data.time }]
            : [];
    const [selectedIndex, setSelectedIndex] = useState(0);

    const handleConfirm = () => {
        if (confirmBusy) return;
        if (slots[selectedIndex] && onConfirm) {
            onConfirm(slots[selectedIndex]);
        }
    };

    return (
        <View style={styles.wrapper}>
        <View style={[styles.card, isFromMe ? styles.cardTailRight : styles.cardTailLeft]}>
            <Text style={styles.senderLabel}>{senderLabel}</Text>
            <View style={styles.header}>
                <View style={styles.iconWrap}>
                    <Calendar size={20} color={AURORA.blue} />
                </View>
                <Text style={styles.title}>{data.title || 'Schedule Next Session'}</Text>
            </View>
            {data.note && (
                <Text style={styles.quote}>"{data.note}"</Text>
            )}
            {settled && st !== 'confirmed' && (
                <View
                    style={[
                        styles.statusBanner,
                        st === 'confirmed' ? styles.statusBannerOk : styles.statusBannerMuted,
                    ]}
                >
                    <Text
                        style={[
                            styles.statusBannerText,
                            st === 'confirmed' ? styles.statusBannerTextOk : styles.statusBannerTextMuted,
                        ]}
                    >
                        {st === 'confirmed'
                            ? data.agreedSlot
                                ? `Accepted — ${data.agreedSlot.date}, ${data.agreedSlot.time}`
                                : 'Accepted — saved to your schedule.'
                            : st === 'completed'
                              ? 'This session was completed.'
                              : st === 'missed'
                                ? 'This session was marked as missed.'
                                : 'This session was cancelled.'}
                    </Text>
                </View>
            )}
            {slots.length > 0 && (
                <View style={styles.slots}>
                    {slots.map((slot, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.slotRow}
                            onPress={() => !settled && setSelectedIndex(i)}
                            activeOpacity={settled ? 1 : 0.8}
                            disabled={settled}
                        >
                            <Calendar size={14} color={AURORA.textSec} style={styles.slotIcon} />
                            <Text style={styles.slotText}>{slot.date}, {slot.time}</Text>
                            <View style={[
                                styles.radio,
                                selectedIndex === i && styles.radioSelected,
                            ]}>
                                {selectedIndex === i && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
            {onConfirm && slots.length > 0 && !settled && (
                <Pressable
                    style={({ pressed }) => [
                        styles.confirmBtnOuter,
                        pressed && !confirmBusy && styles.confirmBtnOuterPressed,
                        confirmBusy && styles.confirmBtnDisabled,
                    ]}
                    onPress={handleConfirm}
                    disabled={confirmBusy}
                    android_ripple={{ color: 'rgba(255, 255, 255, 0.25)', foreground: true }}
                >
                    <View style={styles.confirmBtnInner}>
                        <View style={styles.confirmBtnIconCircle}>
                            <Check size={18} color="#32CD32" strokeWidth={2.75} />
                        </View>
                        <Text style={styles.confirmBtnText}>
                            {confirmBusy ? 'Confirming…' : 'Confirm slot'}
                        </Text>
                    </View>
                </Pressable>
            )}
        </View>
        <View style={[styles.tail, isFromMe ? styles.tailRight : styles.tailLeft]} />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'relative',
        maxWidth: 300,
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
    senderLabel: {
        color: AURORA.textMuted,
        fontSize: 11,
        marginBottom: 8,
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
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    quote: {
        color: AURORA.textSec,
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: 14,
        lineHeight: 20,
    },
    slots: {
        gap: 8,
        marginBottom: 14,
    },
    slotRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    slotIcon: {
        marginRight: 8,
    },
    slotText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
    },
    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: AURORA.textSec,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: AURORA.blue,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: AURORA.blue,
    },
    confirmBtnOuter: {
        width: '100%',
        marginTop: 6,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'rgba(45,107,255,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(45,107,255,0.45)',
        ...Platform.select({
            ios: {
                shadowColor: '#1e40af',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.16,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    confirmBtnOuterPressed: {
        opacity: 0.92,
        transform: [{ scale: 0.985 }],
    },
    confirmBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        paddingVertical: 10,
        paddingHorizontal: 14,
        gap: 8,
    },
    confirmBtnIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(45,107,255,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: {
        color: '#CFE0FF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    confirmBtnDisabled: {
        opacity: 0.55,
    },
    statusBanner: {
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 8,
        borderWidth: 1,
    },
    statusBannerOk: {
        backgroundColor: 'rgba(34,197,94,0.15)',
        borderColor: 'rgba(34,197,94,0.35)',
    },
    statusBannerMuted: {
        backgroundColor: 'rgba(148,163,184,0.12)',
        borderColor: 'rgba(148,163,184,0.3)',
    },
    statusBannerText: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    statusBannerTextOk: {
        color: '#86efac',
    },
    statusBannerTextMuted: {
        color: AURORA.textSec,
    },
});
