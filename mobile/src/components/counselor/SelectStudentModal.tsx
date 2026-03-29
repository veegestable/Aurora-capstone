/**
 * Counselor picks a student to create a conversation (Firestore conversations doc).
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TextInput,
    Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import { AURORA } from '../../constants/aurora-colors';
import { LetterAvatar } from '../common/LetterAvatar';
import { firestoreService } from '../../services/firebase-firestore.service';

export interface StudentRow {
    id: string;
    full_name?: string;
    avatar_url?: string;
    department?: string;
    year_level?: string;
}

interface SelectStudentModalProps {
    visible: boolean;
    onClose: () => void;
    /** Student user IDs that already have a conversation with this counselor */
    existingStudentIds: string[];
    counselorId: string;
    counselorName: string;
    counselorAvatar?: string;
    onConversationCreated: (studentId: string) => void;
}

export default function SelectStudentModal({
    visible,
    onClose,
    existingStudentIds,
    counselorId,
    counselorName,
    counselorAvatar,
    onConversationCreated,
}: SelectStudentModalProps) {
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [addingId, setAddingId] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    const existing = useMemo(() => new Set(existingStudentIds), [existingStudentIds]);

    useEffect(() => {
        if (!visible) {
            setQuery('');
            return;
        }
        setLoading(true);
        firestoreService
            .getUsersByRole('student')
            .then((users) => setStudents((users || []) as StudentRow[]))
            .catch(() => setStudents([]))
            .finally(() => setLoading(false));
    }, [visible]);

    const available = useMemo(() => {
        return students.filter((s) => !existing.has(s.id));
    }, [students, existing]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return available;
        return available.filter((s) => {
            const name = (s.full_name || '').toLowerCase();
            const dept = (s.department || '').toLowerCase();
            return name.includes(q) || dept.includes(q);
        });
    }, [available, query]);

    const handleAdd = async (student: StudentRow) => {
        if (addingId) return;
        setAddingId(student.id);
        try {
            const program = [student.department, student.year_level].filter(Boolean).join(' · ') || undefined;
            await firestoreService.addConversation(
                counselorId,
                {
                    id: student.id,
                    name: student.full_name || 'Student',
                    avatar: student.avatar_url || '',
                    program,
                },
                { name: counselorName || 'Counselor', avatar: counselorAvatar }
            );
            onConversationCreated(student.id);
            onClose();
        } catch (e) {
            console.error('addConversation', e);
            Alert.alert('Could not start chat', 'Please try again.');
        } finally {
            setAddingId(null);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={styles.sheet}>
                    <View style={styles.handleBar} />
                    <View style={styles.header}>
                        <Text style={styles.title}>Add student</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={12}>
                            <X size={24} color={AURORA.textSec} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.hint}>
                        Choose a student to open a conversation. They will appear in your messages list.
                    </Text>

                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search by name..."
                        placeholderTextColor={AURORA.textMuted}
                        style={styles.search}
                    />

                    {loading ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color={AURORA.blue} />
                        </View>
                    ) : filtered.length === 0 ? (
                        <Text style={styles.emptyText}>
                            {available.length === 0
                                ? students.length === 0
                                    ? 'No student accounts yet.'
                                    : 'All students already have a conversation with you.'
                                : 'No matches.'}
                        </Text>
                    ) : (
                        <ScrollView
                            style={styles.list}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                        >
                            {filtered.map((s) => (
                                <TouchableOpacity
                                    key={s.id}
                                    style={[styles.row, addingId === s.id && styles.rowDisabled]}
                                    onPress={() => handleAdd(s)}
                                    disabled={!!addingId}
                                    activeOpacity={0.8}
                                >
                                    <LetterAvatar
                                        name={s.full_name || 'Student'}
                                        size={44}
                                        avatarUrl={s.avatar_url || undefined}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.name}>{s.full_name || 'Student'}</Text>
                                        {(s.department || s.year_level) && (
                                            <Text style={styles.sub} numberOfLines={1}>
                                                {[s.department, s.year_level].filter(Boolean).join(' · ')}
                                            </Text>
                                        )}
                                    </View>
                                    {addingId === s.id && (
                                        <ActivityIndicator size="small" color={AURORA.blue} />
                                    )}
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
        marginBottom: 12,
    },
    search: {
        backgroundColor: AURORA.cardDark,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AURORA.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#FFFFFF',
        fontSize: 15,
        marginBottom: 12,
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
        maxHeight: 360,
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
    rowDisabled: {
        opacity: 0.7,
    },
    name: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    sub: {
        color: AURORA.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
});
