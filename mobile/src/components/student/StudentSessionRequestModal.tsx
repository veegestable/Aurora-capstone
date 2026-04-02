/**
 * StudentSessionRequestModal - Student requests a counseling session
 * Preferred time + note, sends to counselor in the conversation
 */

import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Send, Calendar } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';

export interface SessionRequestFormData {
    preferredDate: Date;
    note: string;
}

interface StudentSessionRequestModalProps {
    visible: boolean;
    onClose: () => void;
    onSend: (data: SessionRequestFormData) => void;
    initialPreferredDate?: Date | null;
    initialNote?: string;
}

function formatDateTime(date: Date): string {
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

export default function StudentSessionRequestModal({
    visible,
    onClose,
    onSend,
    initialPreferredDate,
    initialNote,
}: StudentSessionRequestModalProps) {
    const getDefaultPreferredDate = () => {
        const d = new Date();
        d.setMinutes(0);
        d.setSeconds(0);
        return d;
    };

    const DEFAULT_NOTE =
        "I've been feeling a bit overwhelmed with midterms lately and would love to chat about some stress management strategies.";

    const [preferredDate, setPreferredDate] = useState<Date>(() => getDefaultPreferredDate());
    const [note, setNote] = useState<string>(initialNote ?? DEFAULT_NOTE);
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setPreferredDate(initialPreferredDate ?? getDefaultPreferredDate());
        setNote(initialNote ?? DEFAULT_NOTE);
        setShowPicker(false);
    }, [visible, initialPreferredDate, initialNote]);

    const handleDateChange = (_: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowPicker(false);
        if (selectedDate) setPreferredDate(selectedDate);
    };

    const handleSend = () => {
        onSend({ preferredDate, note: note.trim() });
        onClose();
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

                    <Text style={styles.label}>Preferred Time</Text>
                    <TouchableOpacity
                        style={styles.timeRow}
                        onPress={() => setShowPicker(true)}
                        activeOpacity={0.8}
                    >
                        <Calendar size={18} color={AURORA.blue} />
                        <Text style={styles.timeText}>{formatDateTime(preferredDate)}</Text>
                    </TouchableOpacity>

                    {showPicker && (
                        <View style={styles.pickerWrap}>
                            <DateTimePicker
                                value={preferredDate}
                                mode="datetime"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={styles.pickerDone}
                                    onPress={() => setShowPicker(false)}
                                >
                                    <Text style={styles.pickerDoneText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <Text style={styles.label}>Your Note (optional)</Text>
                    <TextInput
                        style={styles.noteInput}
                        placeholder="Share what you'd like to discuss..."
                        placeholderTextColor={AURORA.textMuted}
                        value={note}
                        onChangeText={setNote}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={styles.sendBtn}
                        onPress={handleSend}
                        activeOpacity={0.85}
                    >
                        <Send size={18} color="#FFFFFF" />
                        <Text style={styles.sendBtnText}>Send Session Request</Text>
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
    label: {
        color: AURORA.textSec,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: AURORA.cardDark,
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: AURORA.border,
    },
    timeText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    pickerWrap: {
        marginBottom: 16,
    },
    pickerDone: {
        alignSelf: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 8,
    },
    pickerDoneText: {
        color: AURORA.blue,
        fontSize: 16,
        fontWeight: '600',
    },
    noteInput: {
        backgroundColor: AURORA.cardDark,
        borderRadius: 12,
        padding: 14,
        color: '#FFFFFF',
        fontSize: 14,
        minHeight: 100,
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
    sendBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
