/**
 * DashboardSessionRequestModal - Student requests a session from dashboard
 * Simple form: pick counselor + note. Creates session with status 'requested'.
 * Counselor will propose time slots after reviewing.
 */

import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { X, Send } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';
import { LetterAvatar } from '../common/LetterAvatar';
import { firestoreService } from '../../services/firebase-firestore.service';

interface Counselor {
    id: string;
    full_name?: string;
    avatar_url?: string;
}

interface DashboardSessionRequestModalProps {
    visible: boolean;
    studentId: string;
    studentName?: string;
    studentAvatar?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DashboardSessionRequestModal({
    visible,
    studentId,
    studentName,
    studentAvatar,
    onClose,
    onSuccess,
}: DashboardSessionRequestModalProps) {
    const [counselors, setCounselors] = useState<Counselor[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [selectedCounselorId, setSelectedCounselorId] = useState<string | null>(null);
    const [note, setNote] = useState(
        "I've been feeling a bit overwhelmed and would like to talk to someone.",
    );

    useEffect(() => {
        if (visible) {
            setLoading(true);
            firestoreService
                .getUsersByRole('counselor')
                .then((users) => setCounselors(users as Counselor[]))
                .catch(() => setCounselors([]))
                .finally(() => setLoading(false));
        }
    }, [visible]);

    const handleSend = async () => {
        if (!selectedCounselorId || !note.trim() || sending) return;
        const counselor = counselors.find((c) => c.id === selectedCounselorId);
        setSending(true);
        try {
            const sessionId = await firestoreService.createSessionRequest(
                studentId,
                selectedCounselorId,
                note.trim(),
            );
            await firestoreService.addSessionRequestToConversation(
                selectedCounselorId,
                studentId,
                sessionId,
                note.trim(),
                {
                    studentData: studentName && studentAvatar
                        ? { name: studentName, avatar: studentAvatar }
                        : undefined,
                    counselorData: counselor
                        ? { name: counselor.full_name ?? 'Counselor', avatar: counselor.avatar_url }
                        : undefined,
                },
            );
            onSuccess();
            onClose();
        } catch (e) {
            console.error('Failed to create session request:', e);
        } finally {
            setSending(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={styles.sheet}>
                    <View style={styles.handleBar} />
                    <View style={styles.header}>
                        <Text style={styles.title}>Request a Session</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={12}>
                            <X size={24} color={AURORA.textSec} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.hint}>
                        Choose a counselor and share why you'd like to talk. They'll review your
                        request and propose time slots.
                    </Text>

                    <Text style={styles.label}>Select Counselor</Text>
                    {loading ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color={AURORA.blue} />
                        </View>
                    ) : counselors.length === 0 ? (
                        <Text style={styles.emptyText}>No counselors available.</Text>
                    ) : (
                        <ScrollView
                            style={styles.counselorList}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                        >
                            {counselors.map((c) => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={[
                                        styles.counselorRow,
                                        selectedCounselorId === c.id && styles.counselorRowSelected,
                                    ]}
                                    onPress={() => setSelectedCounselorId(c.id)}
                                    activeOpacity={0.8}
                                >
                                    <View style={{ marginRight: 12 }}>
                                        <LetterAvatar name={c.full_name ?? 'Counselor'} size={44} />
                                    </View>
                                    <View style={styles.counselorInfo}>
                                        <Text style={styles.counselorName}>
                                            {c.full_name || 'Counselor'}
                                        </Text>
                                    </View>
                                    {selectedCounselorId === c.id && (
                                        <View style={styles.check}>
                                            <Text style={styles.checkText}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    <Text style={styles.label}>Your Note</Text>
                    <TextInput
                        style={styles.noteInput}
                        placeholder="Share what you'd like to discuss..."
                        placeholderTextColor={AURORA.textMuted}
                        value={note}
                        onChangeText={setNote}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[
                            styles.sendBtn,
                            (!selectedCounselorId || !note.trim()) && styles.sendBtnDisabled,
                        ]}
                        onPress={handleSend}
                        disabled={!selectedCounselorId || !note.trim() || sending}
                        activeOpacity={0.85}
                    >
                        {sending ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <>
                                <Send size={18} color="#FFFFFF" />
                                <Text style={styles.sendBtnText}>Send Request</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
        maxHeight: '85%',
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
        marginBottom: 12,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    hint: {
        color: AURORA.textSec,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 16,
    },
    label: {
        color: AURORA.textSec,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    loadingRow: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyText: {
        color: AURORA.textMuted,
        fontSize: 14,
        marginBottom: 16,
    },
    counselorList: {
        maxHeight: 160,
        marginBottom: 16,
    },
    counselorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: AURORA.cardDark,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    counselorRowSelected: {
        borderColor: AURORA.blue,
    },
    counselorInfo: {
        flex: 1,
    },
    counselorName: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    check: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: AURORA.blue,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    noteInput: {
        backgroundColor: AURORA.cardDark,
        borderRadius: 12,
        padding: 14,
        color: '#FFFFFF',
        fontSize: 14,
        minHeight: 80,
        borderWidth: 1,
        borderColor: AURORA.border,
        marginBottom: 20,
    },
    sendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: AURORA.blue,
        borderRadius: 14,
        paddingVertical: 14,
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
    sendBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
