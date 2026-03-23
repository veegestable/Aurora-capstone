import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { X, Pencil, Trash2 } from 'lucide-react-native';
import type { Announcement } from '../../services/announcements.service';
import { AURORA } from '../../constants/aurora-colors';
import { Megaphone } from 'lucide-react-native';
import { triggerHaptic } from '../../utils/haptics';

interface AnnouncementDetailModalProps {
  visible: boolean;
  announcement: Announcement | null;
  canEdit: boolean;
  /** When true, shows delete button. Counselor who posted OR admin. */
  canDelete?: boolean;
  /** When true, shows createdByName. For counselor/admin view only, not students. */
  showAuthor?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}

function formatFullDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function AnnouncementDetailModal({
  visible,
  announcement,
  canEdit,
  canDelete = false,
  showAuthor = false,
  onClose,
  onEdit,
  onDelete,
}: AnnouncementDetailModalProps) {
  const handleDeletePress = () => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('light');
            onDelete?.();
          },
        },
      ]
    );
  };

  if (!announcement) return null;

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
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={() => { triggerHaptic('light'); onClose(); }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={22} color={AURORA.textSec} />
              </TouchableOpacity>
              {canEdit && (
                <TouchableOpacity
                  onPress={() => { triggerHaptic('light'); onEdit(); }}
                  style={styles.editBtn}
                >
                  <Pencil size={16} color={AURORA.blue} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
              {canDelete && onDelete && (
                <TouchableOpacity
                  onPress={handleDeletePress}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={16} color={AURORA.red} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {announcement.imageUrl ? (
              <Image
                source={{ uri: announcement.imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Megaphone size={40} color={AURORA.blue} />
              </View>
            )}
            <Text style={styles.title}>{announcement.title}</Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>
                {showAuthor ? (
                  <>Published by: {announcement.createdByName} · {formatFullDate(announcement.createdAt)}</>
                ) : (
                  <Text style={styles.metaText}>Published on: {formatFullDate(announcement.createdAt)}</Text>
                )}
              </Text>
            </View>
            <Text style={styles.content}>{announcement.content}</Text>
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
    height: Dimensions.get('window').height * 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: AURORA.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(45,107,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(45,107,255,0.4)',
  },
  editBtnText: {
    color: AURORA.blue,
    fontSize: 14,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  deleteBtnText: {
    color: AURORA.red,
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
    flexGrow: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    flexGrow: 1,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: AURORA.border,
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    backgroundColor: 'rgba(45,107,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 28,
  },
  meta: {
    marginBottom: 20,
  },
  metaText: {
    color: AURORA.textSec,
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
});
