import { AppText as Text } from "../common/AppText";
/**
 * SessionRequestDetailsModal - Shows full session request details (status, time, note).
 * Opened when "View details" is tapped on SessionRequestCard.
 */

import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { X, Clock, FileText, MapPin } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';
import type { SessionRequestData } from './SessionRequestCard';
import {
    getSessionPresentation,
    sessionPresentationColors,
} from '../../utils/sessionPresentation';

interface SessionRequestDetailsModalProps {
    visible: boolean;
    data: SessionRequestData | null;
    onClose: () => void;
}

export default function SessionRequestDetailsModal({
    visible,
    data,
    onClose,
}: SessionRequestDetailsModalProps) {
    if (!visible) return null;

    const presentation = data
        ? getSessionPresentation({
              status: data.status,
              role: 'student',
              counselorOfferedSlots: data.counselorOfferedSlots,
          })
        : null;
    const statusColors = presentation
        ? sessionPresentationColors(presentation.variant)
        : null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={styles.sheet}>
                    <View style={styles.handleBar} />
                    <View style={styles.header}>
                        <Text style={styles.title}>Session request details</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={12}>
                            <X size={24} color={AURORA.textSec} />
                        </TouchableOpacity>
                    </View>

                    {data ? (
                        <ScrollView
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={[styles.statusPill, { backgroundColor: statusColors!.bg }]}>
                                <Text style={[styles.statusText, { color: statusColors!.text }]}>
                                    {presentation!.pillLabel}
                                </Text>
                            </View>
                            {presentation!.subtitle ? (
                                <Text style={styles.statusSubtitle}>{presentation!.subtitle}</Text>
                            ) : null}

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Clock size={18} color={AURORA.blue} />
                                    <Text style={styles.sectionLabel}>
                                        {data.status === 'confirmed'
                                            ? 'Scheduled time'
                                            : 'Preferred time'}
                                    </Text>
                                </View>
                                <Text style={styles.sectionValue}>{data.preferredTime}</Text>
                            </View>

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <MapPin size={18} color={AURORA.blue} />
                                    <Text style={styles.sectionLabel}>Location</Text>
                                </View>
                                <Text style={styles.sectionValue}>
                                    Office of Guidance and Counseling (OGC)
                                </Text>
                            </View>

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <FileText size={18} color={AURORA.blue} />
                                    <Text style={styles.sectionLabel}>Your note</Text>
                                </View>
                                <Text style={styles.noteValue}>
                                    {data.note || 'No note added'}
                                </Text>
                            </View>
                        </ScrollView>
                    ) : (
                        <Text style={styles.empty}>No details available.</Text>
                    )}

                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={onClose}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.closeBtnText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: { ...StyleSheet.absoluteFillObject },
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
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: AURORA.border,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    scroll: {
        maxHeight: 320,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    statusSubtitle: {
        color: AURORA.textSec,
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 16,
    },
    statusPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 20,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    sectionLabel: {
        color: AURORA.textMuted,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    sectionValue: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        paddingLeft: 26,
    },
    noteValue: {
        color: AURORA.textSec,
        fontSize: 14,
        lineHeight: 22,
        paddingLeft: 26,
    },
    empty: {
        color: AURORA.textSec,
        fontSize: 14,
        marginBottom: 20,
    },
    closeBtn: {
        backgroundColor: AURORA.blue,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    closeBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
