/**
 * SessionCard - Session confirmed/invite card shown in chat
 * Gradient card with session details, View Details & Reschedule buttons
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';

export interface SessionCardData {
    id: string;
    type: 'invite' | 'confirmed';
    title: string;
    counselorName?: string;
    date: string;
    time: string;
    location?: string;
}

interface SessionCardProps {
    data: SessionCardData;
    isFromMe?: boolean;
    onViewDetails?: () => void;
    onReschedule?: () => void;
}

export default function SessionCard({ data, isFromMe, onViewDetails, onReschedule }: SessionCardProps) {
    const statusLabel = data.type === 'confirmed' ? 'SESSION CONFIRMED' : 'SESSION INVITE';

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
                            {data.date} • {data.time}
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
                        style={styles.primaryBtn}
                        onPress={onViewDetails}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryBtnText}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={onReschedule}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.secondaryBtnText}>Reschedule</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
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
    secondaryBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
});
