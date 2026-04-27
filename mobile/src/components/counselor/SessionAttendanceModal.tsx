/**
 * SessionAttendanceModal - Post-session verification for counselor
 * Did the student show up? Showed Up / Did Not Show Up / Needs Rescheduling
 */

import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { Check, X, RotateCcw, ChevronRight } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';
import { LetterAvatar } from '../common/LetterAvatar';
import { db } from '../../services/firebase';

export type AttendanceStatus = 'showed_up' | 'did_not_show' | 'needs_rescheduling';

interface StudentInfo {
    id: string;
    name: string;
    avatar: string;
}

interface SessionInfo {
    date: string;
    timeRange: string;
}

interface SessionAttendanceModalProps {
    visible: boolean;
    student: StudentInfo;
    session: SessionInfo;
    onClose: () => void;
    onMarkLater: () => void;
    onMarkStatus: (status: AttendanceStatus) => void;
}

export default function SessionAttendanceModal({
    visible,
    student,
    session,
    onClose,
    onMarkLater,
    onMarkStatus,
}: SessionAttendanceModalProps) {
    const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState(student.avatar ?? '');

    useEffect(() => {
        let cancelled = false;
        setResolvedAvatarUrl(student.avatar ?? '');

        const loadAvatar = async () => {
            if (!visible || !student.id) return;
            try {
                const snap = await getDoc(doc(db, 'users', student.id));
                if (cancelled || !snap.exists()) return;
                const avatar = snap.data()?.avatar_url;
                if (typeof avatar === 'string' && avatar.trim()) {
                    setResolvedAvatarUrl(avatar);
                }
            } catch {
                // Keep provided avatar fallback.
            }
        };

        void loadAvatar();
        return () => {
            cancelled = true;
        };
    }, [visible, student.id, student.avatar]);

    if (!visible) return null;

    const options: { status: AttendanceStatus; label: string; icon: typeof Check; isPrimary?: boolean }[] = [
        { status: 'showed_up', label: 'Showed Up', icon: Check, isPrimary: true },
        { status: 'did_not_show', label: 'Did Not Show Up', icon: X },
        { status: 'needs_rescheduling', label: 'Needs Rescheduling', icon: RotateCcw },
    ];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={styles.sheet}>
                    <View style={styles.handleBar} />

                    {/* Header */}
                    <View style={styles.iconWrap}>
                        <View style={styles.iconBg}>
                            <Check size={24} color={AURORA.blue} />
                        </View>
                    </View>
                    <Text style={styles.title}>Session Attendance</Text>
                    <Text style={styles.subtitle}>Post-session verification.</Text>

                    {/* Student Card */}
                    <View style={styles.studentCard}>
                        <View style={styles.avatarWrap}>
                            <LetterAvatar name={student.name} size={64} avatarUrl={resolvedAvatarUrl || undefined} />
                            <View style={styles.onlineDot} />
                        </View>
                        <Text style={styles.studentName}>{student.name}</Text>
                        <View style={styles.sessionTime}>
                            <Text style={styles.sessionText}>{session.date}, {session.timeRange}</Text>
                        </View>
                    </View>

                    {/* Status Question */}
                    <Text style={styles.question}>Did the student show up?</Text>
                    <Text style={styles.hint}>Please mark the status to update the records.</Text>

                    {/* Options */}
                    {options.map(({ status, label, icon: Icon, isPrimary }) => (
                        <TouchableOpacity
                            key={status}
                            style={[styles.optionBtn, isPrimary && styles.optionBtnPrimary]}
                            onPress={() => onMarkStatus(status)}
                            activeOpacity={0.85}
                        >
                            <Icon
                                size={18}
                                color={isPrimary ? '#FFFFFF' : status === 'did_not_show' ? AURORA.red : AURORA.textSec}
                            />
                            <Text
                                style={[
                                    styles.optionLabel,
                                    isPrimary && styles.optionLabelPrimary,
                                    status === 'did_not_show' && !isPrimary && styles.optionLabelRed,
                                ]}
                            >
                                {label}
                            </Text>
                            <ChevronRight
                                size={18}
                                color={isPrimary ? '#FFFFFF' : AURORA.textSec}
                            />
                        </TouchableOpacity>
                    ))}

                    {/* Dismiss */}
                    <TouchableOpacity style={styles.dismissBtn} onPress={onMarkLater}>
                        <Text style={styles.dismissText}>Close and decide later</Text>
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
    iconWrap: {
        alignItems: 'center',
        marginBottom: 12,
    },
    iconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(45,107,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        color: AURORA.textSec,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    studentCard: {
        backgroundColor: AURORA.cardDark,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: AURORA.border,
    },
    avatarWrap: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: AURORA.cardAlt,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: AURORA.green,
        borderWidth: 2,
        borderColor: AURORA.cardDark,
    },
    studentName: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    sessionTime: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sessionText: {
        color: AURORA.textSec,
        fontSize: 13,
    },
    question: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    hint: {
        color: AURORA.textSec,
        fontSize: 13,
        marginBottom: 16,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: AURORA.cardDark,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: AURORA.border,
    },
    optionBtnPrimary: {
        backgroundColor: AURORA.blue,
        borderColor: AURORA.blue,
    },
    optionLabel: {
        flex: 1,
        color: AURORA.textSec,
        fontSize: 15,
        fontWeight: '600',
    },
    optionLabelPrimary: {
        color: '#FFFFFF',
    },
    optionLabelRed: {
        color: AURORA.red,
    },
    dismissBtn: {
        alignItems: 'center',
        paddingVertical: 14,
        marginTop: 8,
    },
    dismissText: {
        color: AURORA.textMuted,
        fontSize: 14,
    },
});
