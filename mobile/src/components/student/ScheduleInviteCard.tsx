/**
 * ScheduleInviteCard - Session scheduling card for students
 * Displays counselor's session invite with selectable time slots
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar } from 'lucide-react-native';
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
}

interface ScheduleInviteCardProps {
    data: ScheduleInviteData;
    senderLabel?: string;
    onConfirm?: (selectedSlot: TimeSlot) => void;
}

export default function ScheduleInviteCard({
    data,
    senderLabel = 'Aurora Academic Support',
    onConfirm,
}: ScheduleInviteCardProps) {
    const slots = data.timeSlots && data.timeSlots.length > 0
        ? data.timeSlots
        : data.date && data.time
            ? [{ date: data.date, time: data.time }]
            : [];
    const [selectedIndex, setSelectedIndex] = useState(0);

    const handleConfirm = () => {
        if (slots[selectedIndex] && onConfirm) {
            onConfirm(slots[selectedIndex]);
        }
    };

    return (
        <View style={styles.card}>
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
            {slots.length > 0 && (
                <View style={styles.slots}>
                    {slots.map((slot, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.slotRow}
                            onPress={() => setSelectedIndex(i)}
                            activeOpacity={0.8}
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
            {onConfirm && slots.length > 0 && (
                <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                >
                    <Text style={styles.confirmBtnText}>Confirm Selection</Text>
                </TouchableOpacity>
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
    confirmBtn: {
        backgroundColor: AURORA.blue,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
