/**
 * SelectCounselorModal - Student picks a counselor to start a conversation
 * Opens from FAB on Messages screen.
 */

import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';
import { LetterAvatar } from '../common/LetterAvatar';
import { firestoreService } from '../../services/firebase-firestore.service';

export interface Counselor {
    id: string;
    full_name?: string;
    avatar_url?: string;
}

interface SelectCounselorModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (counselor: Counselor) => void;
}

export default function SelectCounselorModal({
    visible,
    onClose,
    onSelect,
}: SelectCounselorModalProps) {
    const [counselors, setCounselors] = useState<Counselor[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setLoading(true);
            firestoreService
                .getUsersByRole('counselor')
                .then((users) => setCounselors((users || []) as Counselor[]))
                .catch(() => setCounselors([]))
                .finally(() => setLoading(false));
        }
    }, [visible]);

    const handleSelect = (counselor: Counselor) => {
        onSelect(counselor);
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={styles.sheet}>
                    <View style={styles.handleBar} />
                    <View style={styles.header}>
                        <Text style={styles.title}>Message a Counselor</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={12}>
                            <X size={24} color={AURORA.textSec} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.hint}>
                        Choose a counselor to start a conversation. You can then send messages and
                        request a session.
                    </Text>

                    {loading ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color={AURORA.blue} />
                        </View>
                    ) : counselors.length === 0 ? (
                        <Text style={styles.emptyText}>No counselors available.</Text>
                    ) : (
                        <ScrollView
                            style={styles.list}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                        >
                            {counselors.map((c) => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={styles.row}
                                    onPress={() => handleSelect(c)}
                                    activeOpacity={0.8}
                                >
                                    <LetterAvatar
                                        name={c.full_name || 'Counselor'}
                                        size={44}
                                        avatarUrl={c.avatar_url || undefined}
                                    />
                                    <Text style={styles.name}>{c.full_name || 'Counselor'}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
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
    loadingRow: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyText: {
        color: AURORA.textMuted,
        fontSize: 14,
        marginBottom: 16,
    },
    list: {
        maxHeight: 320,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: AURORA.cardDark,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: AURORA.border,
        gap: 12,
    },
    name: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
