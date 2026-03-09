/**
 * SendSessionInviteModal - Bottom sheet for counselor to invite student to a session
 * Matches Aurora design: student profile, proposed time slots, supportive note
 */

import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Send, Calendar, Pencil, Info } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';
import { LetterAvatar } from '../common/LetterAvatar';

export type TimeSlotLabel = 'Primary Option' | 'Alternative Option' | 'Final Option';

export interface TimeSlot {
    label: TimeSlotLabel;
    date: Date | null;
}

export interface SessionInviteData {
    primaryDate: Date | null;
    alternativeDate: Date | null;
    finalDate: Date | null;
    note: string;
}

interface StudentInfo {
    id: string;
    name: string;
    avatar?: string;
    program?: string;
    studentId?: string;
}

interface SendSessionInviteModalProps {
    visible: boolean;
    student: StudentInfo;
    counselorName?: string;
    onClose: () => void;
    onSend: (data: SessionInviteData) => void;
}

const SLOT_LABELS: TimeSlotLabel[] = ['Primary Option', 'Alternative Option', 'Final Option'];

function formatDateTime(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}, ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    })}`;
}

export default function SendSessionInviteModal({
    visible,
    student,
    counselorName = 'Counselor',
    onClose,
    onSend,
}: SendSessionInviteModalProps) {
    const [primaryDate, setPrimaryDate] = useState<Date | null>(null);
    const [alternativeDate, setAlternativeDate] = useState<Date | null>(null);
    const [finalDate, setFinalDate] = useState<Date | null>(null);
    const [note, setNote] = useState(
        `Hi ${student.name.split(' ')[0]}, I'd like to check in with you regarding your recent academic progress and see how you're settling into the new semester.`,
    );
    const [pickingSlot, setPickingSlot] = useState<'primary' | 'alternative' | 'final' | null>(null);
    const [tempDate, setTempDate] = useState(new Date());

    const handleDateChange = (_: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setPickingSlot(null);
        if (selectedDate) {
            setTempDate(selectedDate);
            if (Platform.OS === 'ios') return;
            if (pickingSlot === 'primary') setPrimaryDate(selectedDate);
            if (pickingSlot === 'alternative') setAlternativeDate(selectedDate);
            if (pickingSlot === 'final') setFinalDate(selectedDate);
        }
    };

    const handleConfirmDate = () => {
        if (pickingSlot === 'primary') setPrimaryDate(tempDate);
        if (pickingSlot === 'alternative') setAlternativeDate(tempDate);
        if (pickingSlot === 'final') setFinalDate(tempDate);
        setPickingSlot(null);
    };

    const openPicker = (slot: 'primary' | 'alternative' | 'final') => {
        const existing = slot === 'primary' ? primaryDate : slot === 'alternative' ? alternativeDate : finalDate;
        setTempDate(existing || new Date());
        setPickingSlot(slot);
    };

    const handleSend = () => {
        onSend({
            primaryDate,
            alternativeDate,
            finalDate,
            note: note.trim(),
        });
        setPrimaryDate(null);
        setAlternativeDate(null);
        setFinalDate(null);
        setNote(`Hi ${student.name.split(' ')[0]}, I'd like to check in with you regarding your recent academic progress and see how you're settling into the new semester.`);
        onClose();
    };

    const canSend = primaryDate !== null;

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

                    {/* Student Profile */}
                    <View style={styles.profileSection}>
                        <View style={styles.avatarWrap}>
                            <LetterAvatar name={student.name} size={80} />
                            <View style={styles.onlineDot} />
                        </View>
                        <Text style={styles.studentName}>{student.name}</Text>
                        <Text style={styles.program}>
                            {student.program || 'BSCS 3rd Year'} • Student ID: {student.studentId || student.id.slice(0, 8)}
                        </Text>
                        <Text style={styles.purpose}>Invite to a supportive counseling session</Text>
                    </View>

                    <ScrollView
                        style={styles.scroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Proposed Time Slots */}
                        <Text style={styles.sectionTitle}>PROPOSED TIME SLOTS</Text>
                        {(['primary', 'alternative', 'final'] as const).map((slot, i) => {
                            const value = slot === 'primary' ? primaryDate : slot === 'alternative' ? alternativeDate : finalDate;
                            return (
                                <TouchableOpacity
                                    key={slot}
                                    style={styles.slotCard}
                                    onPress={() => openPicker(slot)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.slotIcon}>
                                        <Calendar size={18} color={AURORA.blue} />
                                    </View>
                                    <View style={styles.slotContent}>
                                        <Text style={styles.slotLabel}>{SLOT_LABELS[i]}</Text>
                                        <Text style={[styles.slotValue, !value && styles.placeholder]}>
                                            {value ? formatDateTime(value) : 'mm/dd/yyyy, --:---'}
                                        </Text>
                                    </View>
                                    <Pencil size={16} color={AURORA.blue} />
                                </TouchableOpacity>
                            );
                        })}

                        {/* Supportive Note */}
                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>INCLUDE A SUPPORTIVE NOTE</Text>
                        <TextInput
                            style={styles.noteInput}
                            placeholder="Type your message..."
                            placeholderTextColor={AURORA.textMuted}
                            value={note}
                            onChangeText={setNote}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                        <View style={styles.infoRow}>
                            <Info size={14} color={AURORA.textMuted} />
                            <Text style={styles.infoText}>This message will be sent along with your invitation.</Text>
                        </View>
                    </ScrollView>

                    {/* Send Button */}
                    <TouchableOpacity
                        style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
                        onPress={handleSend}
                        disabled={!canSend}
                        activeOpacity={0.85}
                    >
                        <Send size={18} color="#FFFFFF" />
                        <Text style={styles.sendBtnText}>Send Session Invite</Text>
                    </TouchableOpacity>

                    {pickingSlot && (
                        <View style={styles.pickerOverlay}>
                            <DateTimePicker
                                value={tempDate}
                                mode="datetime"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                            />
                            {Platform.OS === 'ios' && (
                                <View style={styles.pickerActions}>
                                    <TouchableOpacity onPress={() => setPickingSlot(null)} style={styles.pickerBtn}>
                                        <Text style={styles.pickerBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleConfirmDate} style={[styles.pickerBtn, styles.pickerBtnPrimary]}>
                                        <Text style={styles.pickerBtnTextPrimary}>Confirm</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
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
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        backgroundColor: AURORA.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: AURORA.border,
        paddingHorizontal: 20,
        paddingBottom: 34,
        maxHeight: '90%',
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: AURORA.border,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarWrap: {
        position: 'relative',
        marginBottom: 10,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: AURORA.cardAlt,
        borderWidth: 3,
        borderColor: AURORA.card,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: AURORA.green,
        borderWidth: 2,
        borderColor: AURORA.card,
    },
    studentName: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
    },
    program: {
        color: AURORA.blue,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },
    purpose: {
        color: AURORA.textSec,
        fontSize: 14,
    },
    scroll: {
        maxHeight: 320,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 12,
    },
    slotCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AURORA.cardDark,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: AURORA.border,
    },
    slotIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(45,107,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    slotContent: {
        flex: 1,
    },
    slotLabel: {
        color: AURORA.textSec,
        fontSize: 12,
        marginBottom: 2,
    },
    slotValue: {
        color: AURORA.blue,
        fontSize: 15,
        fontWeight: '700',
    },
    placeholder: {
        color: AURORA.textMuted,
        fontWeight: '400',
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
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
    },
    infoText: {
        color: AURORA.textMuted,
        fontSize: 12,
    },
    sendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: AURORA.blue,
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 16,
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
    pickerOverlay: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: AURORA.border,
    },
    pickerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        marginTop: 12,
    },
    pickerBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    pickerBtnPrimary: {
        backgroundColor: AURORA.blue,
        borderRadius: 8,
    },
    pickerBtnText: {
        color: AURORA.textSec,
        fontSize: 15,
    },
    pickerBtnTextPrimary: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
