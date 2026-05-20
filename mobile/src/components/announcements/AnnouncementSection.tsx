import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { AppText as Text } from "../common/AppText";
import { Plus, CircleHelp } from "lucide-react-native";
import { useAuth } from "../../stores/AuthContext";
import { AnnouncementCarousel } from "./AnnouncementCarousel";
import { AddAnnouncementModal } from "./AddAnnouncementModal";
import { AnnouncementDetailModal } from "./AnnouncementDetailModal";
import { EditAnnouncementModal } from "./EditAnnouncementModal";
import { announcementsService } from "../../services/announcements.service";
import type { Announcement } from "../../services/announcements.service";
import { AURORA } from "../../constants/aurora-colors";
import { triggerHaptic } from "../../utils/haptics";
import { InfoGuideModal } from "../common/InfoGuideModal";
import { announcementGuideForRole } from "../../constants/announcements/announcementGuideCopy";

interface AnnouncementSectionProps {
  role: "counselor" | "student" | "admin";
  showAddButton?: boolean;
  titleIcon?: React.ReactNode;
  /** Admin dashboard: show every announcement (Firestore still enforces admin read). */
  skipAudienceFilter?: boolean;
}

export function AnnouncementSection({
  role,
  showAddButton = false,
  titleIcon,
  skipAudienceFilter = false,
}: AnnouncementSectionProps) {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const showAnnouncementGuide = role === "counselor" || role === "admin";
  const announcementGuide = announcementGuideForRole(
    role === "admin" ? "admin" : "counselor",
  );

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
    !!selectedAnnouncement &&
    (user?.role === "admin" ||
      (role === "counselor" &&
        !!user?.id &&
        selectedAnnouncement.createdBy === user.id));

  const canDelete =
    role !== "student" &&
    !!selectedAnnouncement &&
    ((!!user?.id && selectedAnnouncement.createdBy === user.id) ||
      user?.role === "admin");

  const handleDelete = async () => {
    if (!selectedAnnouncement?.id) return;
    try {
      await announcementsService.delete(selectedAnnouncement.id);
      setDetailModalVisible(false);
      setEditModalVisible(false);
      setSelectedAnnouncement(null);
      setRefreshKey((k) => k + 1);
    } catch {
      // TODO: show error toast
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          {titleIcon}
          <Text style={styles.sectionTitle}>Announcements</Text>
          {showAnnouncementGuide ? (
            <TouchableOpacity
              onPress={() => setGuideVisible(true)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              style={{ padding: 2 }}
              accessibilityLabel="How announcements work"
            >
              <CircleHelp size={16} color={AURORA.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        {showAddButton && (
          <TouchableOpacity
            onPress={() => {
              triggerHaptic("light");
              setModalVisible(true);
            }}
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
        role={user?.role === "admin" ? "admin" : role}
        viewerCollegeCode={user?.college_code ?? user?.department}
        viewerUserId={user?.id}
        skipAudienceFilter={skipAudienceFilter}
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
        showAuthor={role !== "student"}
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
      <InfoGuideModal
        guide={guideVisible ? announcementGuide : null}
        onClose={() => setGuideVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(45,107,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(45,107,255,0.4)",
  },
  addBtnText: {
    color: AURORA.blue,
    fontSize: 13,
    fontWeight: "700",
  },
});
