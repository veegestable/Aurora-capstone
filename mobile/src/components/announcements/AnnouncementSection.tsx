import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useAuth } from '../../stores/AuthContext';
import { AnnouncementCarousel } from './AnnouncementCarousel';
import { AddAnnouncementModal } from './AddAnnouncementModal';
import { AnnouncementDetailModal } from './AnnouncementDetailModal';
import { EditAnnouncementModal } from './EditAnnouncementModal';
import { announcementsService } from '../../services/announcements.service';
import type { Announcement } from '../../services/announcements.service';
import { AURORA } from '../../constants/aurora-colors';
import { triggerHaptic } from '../../utils/haptics';

interface AnnouncementSectionProps {
  role: 'counselor' | 'student';
  showAddButton?: boolean;
}

export function AnnouncementSection({ role, showAddButton = false }: AnnouncementSectionProps) {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const handleAnnouncementPress = (item: Announcement) => {
    setSelectedAnnouncement(item);
    setDetailModalVisible(true);
  };

  const handleEditPress = () => {
    setDetailModalVisible(false);
    setEditModalVisible(true);
  };

  const handleDetailClose = () => {
    setDetailModalVisible(false);
    setSelectedAnnouncement(null);
  };

  const handleEditClose = () => {
    setEditModalVisible(false);
    setSelectedAnnouncement(null);
    setRefreshKey((k) => k + 1);
  };

  const canEdit =
    role === 'counselor' &&
    !!user?.id &&
    !!selectedAnnouncement &&
    selectedAnnouncement.createdBy === user.id;

  const canDelete =
    role !== 'student' &&
    !!selectedAnnouncement &&
    ((!!user?.id && selectedAnnouncement.createdBy === user.id) || user?.role === 'admin');

  const handleDelete = async () => {
    if (!selectedAnnouncement?.id) return;
    try {
      await announcementsService.delete(selectedAnnouncement.id);
      setDetailModalVisible(false);
      setEditModalVisible(false);
      setSelectedAnnouncement(null);
      setRefreshKey((k) => k + 1);
    } catch (_) {
      // TODO: show error toast
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Announcements</Text>
        {showAddButton && (
          <TouchableOpacity
            onPress={() => { triggerHaptic('light'); setModalVisible(true); }}
            style={styles.addBtn}
            activeOpacity={0.8}
          >
            <Plus size={18} color={AURORA.blue} />
            <Text style={styles.addBtnText}>Announcement</Text>
          </TouchableOpacity>
        )}
      </View>
      <AnnouncementCarousel
        key={refreshKey}
        role={role}
        onAnnouncementPress={handleAnnouncementPress}
      />
      <AddAnnouncementModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
      <AnnouncementDetailModal
        visible={detailModalVisible}
        announcement={selectedAnnouncement}
        canEdit={canEdit}
        canDelete={canDelete}
        showAuthor={role !== 'student'}
        onClose={handleDetailClose}
        onEdit={handleEditPress}
        onDelete={handleDelete}
      />
      <EditAnnouncementModal
        visible={editModalVisible}
        announcement={selectedAnnouncement}
        onClose={handleEditClose}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(45,107,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(45,107,255,0.4)',
  },
  addBtnText: {
    color: AURORA.blue,
    fontSize: 13,
    fontWeight: '700',
  },
});
