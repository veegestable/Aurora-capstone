import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { AppText as Text } from "../common/AppText";
import { AppTextInput as TextInput } from "../common/AppTextInput";
import * as ImagePicker from "expo-image-picker";
import { X, Camera } from "lucide-react-native";
import { useAuth } from "../../stores/AuthContext";
import {
  announcementsService,
  type Announcement,
  type AnnouncementVisibility,
  type UpdateAnnouncementInput,
} from "../../services/announcements.service";
import { uploadImage } from "../../services/firebase-storage.service";
import { AURORA } from "../../constants/aurora-colors";
import { triggerHaptic } from "../../utils/haptics";
import {
  COLLEGES,
  type CollegeCode,
  isCollegeCode,
} from "../../constants/colleges";

type AdminAudience = "students_all" | "counselors_all" | "colleges_cross";

interface EditAnnouncementModalProps {
  visible: boolean;
  announcement: Announcement | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function visibilityToAdminAudience(
  vis: AnnouncementVisibility | undefined,
  targetRole: Announcement["targetRole"],
): AdminAudience {
  if (vis === "counselors_all") return "counselors_all";
  if (vis === "colleges_cross") return "colleges_cross";
  if (vis === "students_all" || vis === "students_one_college")
    return "students_all";
  if (targetRole === "counselor") return "counselors_all";
  if (targetRole === "student") return "students_all";
  return "students_all";
}

export function EditAnnouncementModal({
  visible,
  announcement,
  onClose,
  onSuccess,
}: EditAnnouncementModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [removedImage, setRemovedImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const [adminAudience, setAdminAudience] =
    useState<AdminAudience>("students_all");
  const [selectedCollegeCodes, setSelectedCollegeCodes] = useState<
    CollegeCode[]
  >([]);

  const isAdmin = user?.role === "admin";
  const isCounselor = user?.role === "counselor";

  const toggleCollege = (code: CollegeCode) => {
    triggerHaptic("light");
    setSelectedCollegeCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  useEffect(() => {
    if (visible && announcement) {
      setTitle(announcement.title);
      setContent(announcement.content);
      setSelectedImageUri(null);
      setRemovedImage(false);
      setAdminAudience(
        visibilityToAdminAudience(
          announcement.visibility,
          announcement.targetRole,
        ),
      );
      setSelectedCollegeCodes(
        (announcement.collegeCodes ?? []).filter((c) => isCollegeCode(c)),
      );
    }
  }, [visible, announcement]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library to add an image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      triggerHaptic("light");
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handleRemoveImage = () => {
    triggerHaptic("light");
    setSelectedImageUri(null);
    setRemovedImage(true);
  };

  const handleRestoreImage = () => {
    triggerHaptic("light");
    setRemovedImage(false);
  };

  const handleSubmit = async () => {
    const t = title.trim();
    const c = content.trim();
    if (!t) {
      Alert.alert("Missing title", "Please enter a title.");
      return;
    }
    if (!c) {
      Alert.alert("Missing content", "Please enter the announcement content.");
      return;
    }
    if (!user || !announcement) return;

    if (isAdmin && adminAudience === "colleges_cross") {
      if (selectedCollegeCodes.length === 0) {
        Alert.alert(
          "Select colleges",
          "Pick at least one college for this announcement.",
        );
        return;
      }
    }

    setSaving(true);
    try {
      let imageUrl: string | undefined | null;
      if (removedImage) {
        imageUrl = null;
      } else if (selectedImageUri) {
        const path = `announcements/${user.id}/${Date.now()}.jpg`;
        imageUrl = await uploadImage(path, selectedImageUri);
      } else {
        imageUrl = announcement.imageUrl ?? undefined;
      }

      let input: UpdateAnnouncementInput = {
        title: t,
        content: c,
        imageUrl,
      };

      if (isAdmin) {
        const visibility: AnnouncementVisibility =
          adminAudience === "students_all"
            ? "students_all"
            : adminAudience === "counselors_all"
              ? "counselors_all"
              : "colleges_cross";
        const collegeCodes =
          adminAudience === "colleges_cross"
            ? selectedCollegeCodes.filter((x) => isCollegeCode(x))
            : [];
        input = {
          ...input,
          publisherRole: announcement.publisherRole ?? "admin",
          visibility,
          collegeCodes,
        };
      }

      await announcementsService.update(announcement.id, input);
      onSuccess?.();
      onClose();
    } catch {
      Alert.alert("Error", "Failed to update announcement. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const adminAudienceOptions: { key: AdminAudience; label: string }[] = [
    { key: "students_all", label: "All students" },
    { key: "counselors_all", label: "All counselors" },
    { key: "colleges_cross", label: "Selected colleges" },
  ];

  const counselorScoped =
    isCounselor && announcement?.visibility === "students_one_college";

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
            <Text style={styles.title}>Edit Announcement</Text>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic("light");
                onClose();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
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

            <Text style={styles.label}>Image (optional)</Text>
            {selectedImageUri ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePickImage}
                style={styles.imagePreviewWrap}
              >
                <Image
                  source={{ uri: selectedImageUri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <TouchableOpacity
                    onPress={handleRemoveImage}
                    style={styles.removeImageBtn}
                  >
                    <X size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.tapToChangeHint}>
                    Tap image to change
                  </Text>
                </View>
              </TouchableOpacity>
            ) : announcement.imageUrl && !removedImage ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePickImage}
                style={styles.imagePreviewWrap}
              >
                <Image
                  source={{ uri: announcement.imageUrl }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <TouchableOpacity
                    onPress={handleRemoveImage}
                    style={styles.removeImageBtn}
                  >
                    <X size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.tapToChangeHint}>
                    Tap image to pick new one
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.pickImageRow}>
                <TouchableOpacity
                  onPress={handlePickImage}
                  style={styles.pickImageBtn}
                >
                  <Camera size={24} color={AURORA.blue} />
                  <Text style={styles.pickImageText}>
                    Add image from gallery
                  </Text>
                </TouchableOpacity>
                {announcement.imageUrl && (
                  <TouchableOpacity
                    onPress={handleRestoreImage}
                    style={styles.restoreBtn}
                  >
                    <Text style={styles.restoreBtnText}>Restore previous</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

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

            {counselorScoped && (
              <Text style={styles.hint}>
                Audience stays limited to students in your college. You can edit
                title, text, and image only.
              </Text>
            )}

            {isAdmin && (
              <>
                <Text style={styles.label}>Audience</Text>
                <View style={styles.roleCol}>
                  {adminAudienceOptions.map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => {
                        triggerHaptic("light");
                        setAdminAudience(r.key);
                      }}
                      style={[
                        styles.roleBtnWide,
                        adminAudience === r.key && styles.roleBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleText,
                          adminAudience === r.key && styles.roleTextActive,
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {adminAudience === "colleges_cross" && (
                  <>
                    <Text style={styles.subHint}>
                      Students and counselors in selected colleges will see this.
                    </Text>
                    <View style={styles.collegeGrid}>
                      {COLLEGES.map((row) => {
                        const on = selectedCollegeCodes.includes(row.code);
                        return (
                          <TouchableOpacity
                            key={row.code}
                            onPress={() => toggleCollege(row.code)}
                            style={[
                              styles.collegeChip,
                              on && styles.collegeChipOn,
                            ]}
                          >
                            <Text
                              style={[
                                styles.collegeChipText,
                                on && styles.collegeChipTextOn,
                              ]}
                            >
                              {row.code}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </>
            )}

            <TouchableOpacity
              onPress={() => {
                triggerHaptic("light");
                void handleSubmit();
              }}
              disabled={saving}
              style={[styles.submit, saving && styles.submitDisabled]}
            >
              <Text style={styles.submitText}>
                {saving ? "Saving..." : "Save Changes"}
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: AURORA.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AURORA.border,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  scroll: { maxHeight: 480 },
  scrollContent: { padding: 20, paddingTop: 16 },
  label: {
    color: AURORA.textSec,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  hint: {
    color: AURORA.textSec,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  subHint: {
    color: AURORA.textMuted,
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 17,
  },
  input: {
    backgroundColor: AURORA.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AURORA.border,
    color: "#FFFFFF",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  imagePreviewWrap: {
    position: "relative",
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 140,
    backgroundColor: AURORA.card,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  tapToChangeHint: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "600",
  },
  removeImageBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickImageRow: {
    marginBottom: 16,
    gap: 8,
  },
  restoreBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  restoreBtnText: {
    color: AURORA.textSec,
    fontSize: 13,
    fontWeight: "600",
  },
  pickImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AURORA.border,
    borderStyle: "dashed",
    backgroundColor: AURORA.card,
  },
  pickImageText: {
    color: AURORA.blue,
    fontSize: 14,
    fontWeight: "600",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  roleCol: {
    gap: 8,
    marginBottom: 16,
  },
  roleBtnWide: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AURORA.border,
    backgroundColor: AURORA.card,
  },
  roleBtnActive: {
    borderColor: AURORA.blue,
    backgroundColor: "rgba(45,107,255,0.15)",
  },
  roleText: {
    color: AURORA.textSec,
    fontSize: 14,
    fontWeight: "600",
  },
  roleTextActive: {
    color: AURORA.blue,
  },
  collegeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  collegeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AURORA.border,
    backgroundColor: AURORA.card,
  },
  collegeChipOn: {
    borderColor: AURORA.blue,
    backgroundColor: "rgba(45,107,255,0.2)",
  },
  collegeChipText: {
    color: AURORA.textSec,
    fontSize: 13,
    fontWeight: "700",
  },
  collegeChipTextOn: {
    color: AURORA.blue,
  },
  submit: {
    backgroundColor: AURORA.blue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
