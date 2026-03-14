import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useAuth } from '../../stores/AuthContext';
import { announcementsService, type CreateAnnouncementInput } from '../../services/announcements.service';
import { AURORA } from '../../constants/aurora-colors';
import { triggerHaptic } from '../../utils/haptics';

interface AddAnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type TargetRole = 'all' | 'counselor' | 'student';

export function AddAnnouncementModal({ visible, onClose, onSuccess }: AddAnnouncementModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetRole, setTargetRole] = useState<TargetRole>('all');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const t = title.trim();
    const c = content.trim();
    if (!t) {
      Alert.alert('Missing title', 'Please enter a title.');
      return;
    }
    if (!c) {
      Alert.alert('Missing content', 'Please enter the announcement content.');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      const input: CreateAnnouncementInput = {
        title: t,
        content: c,
        imageUrl: imageUrl.trim() || undefined,
        targetRole,
        createdBy: user.id,
        createdByName: user.full_name || user.preferred_name || 'Unknown',
      };
      await announcementsService.create(input);
      setTitle('');
      setContent('');
      setImageUrl('');
      setTargetRole('all');
      onSuccess?.();
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Failed to create announcement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const roles: { key: TargetRole; label: string }[] = [
    { key: 'all', label: 'Everyone' },
    { key: 'student', label: 'Students only' },
    { key: 'counselor', label: 'Counselors only' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>New Announcement</Text>
            <TouchableOpacity onPress={() => { triggerHaptic('light'); onClose(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X size={22} color={AURORA.textSec} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter announcement title"
              placeholderTextColor={AURORA.textMuted}
              maxLength={120}
            />

            <Text style={styles.label}>Image URL (optional)</Text>
            <TextInput
              style={styles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://..."
              placeholderTextColor={AURORA.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.label}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder="Write the announcement..."
              placeholderTextColor={AURORA.textMuted}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Visible to</Text>
            <View style={styles.roleRow}>
              {roles.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => { triggerHaptic('light'); setTargetRole(r.key); }}
                  style={[
                    styles.roleBtn,
                    targetRole === r.key && styles.roleBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      targetRole === r.key && styles.roleTextActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => { triggerHaptic('light'); handleSubmit(); }}
              disabled={saving}
              style={[styles.submit, saving && styles.submitDisabled]}
            >
              <Text style={styles.submitText}>
                {saving ? 'Publishing...' : 'Publish'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
  sheet: {
    backgroundColor: AURORA.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AURORA.border,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: { maxHeight: 400 },
  scrollContent: { padding: 20, paddingTop: 16 },
  label: {
    color: AURORA.textSec,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: AURORA.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AURORA.border,
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AURORA.border,
    backgroundColor: AURORA.card,
    alignItems: 'center',
  },
  roleBtnActive: {
    borderColor: AURORA.blue,
    backgroundColor: 'rgba(45,107,255,0.15)',
  },
  roleText: {
    color: AURORA.textSec,
    fontSize: 12,
    fontWeight: '600',
  },
  roleTextActive: {
    color: AURORA.blue,
  },
  submit: {
    backgroundColor: AURORA.blue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
