import React, { useState } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  Platform,
  StyleSheet,
  ScrollView,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import { AppText as Text } from "../common/AppText";
import { AppTextInput as TextInput } from "../common/AppTextInput";
import * as ImagePicker from "expo-image-picker";
import { X, Camera } from "lucide-react-native";
import { useAuth } from "../../stores/AuthContext";
import {
  announcementsService,
  type CreateAnnouncementInput,
} from "../../services/announcements.service";
import { uploadImage } from "../../services/firebase-storage.service";
import { AURORA } from "../../constants/aurora-colors";
import { triggerHaptic } from "../../utils/haptics";
import {
  COLLEGES,
  type CollegeCode,
  isCollegeCode,
  resolveCollegeCodeFromUserData,
} from "../../constants/colleges";
import { InfoGuideOverlay, type InfoGuideContent } from "../common/InfoGuideModal";
import { buildFeedback } from "../../utils/aurora-feedback";

interface AddAnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AdminAudience = "students_all" | "counselors_all" | "colleges_cross";

export function AddAnnouncementModal({
  visible,
  onClose,
  onSuccess,
}: AddAnnouncementModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<InfoGuideContent | null>(null);

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

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setFeedback(
        buildFeedback(
          "Permission needed",
          "Please allow access to your photo library to add an image.",
          "warning",
        ),
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
  };

  const handleSubmit = async () => {
    const t = title.trim();
    const c = content.trim();
    if (!t) {
      setFeedback(buildFeedback("Missing title", "Please enter a title.", "error"));
      return;
    }
    if (!c) {
      setFeedback(
        buildFeedback("Missing content", "Please enter the announcement content.", "error"),
      );
      return;
    }
    if (!user) return;

    if (isCounselor) {
      const cc = resolveCollegeCodeFromUserData(
        user as unknown as Record<string, unknown>,
      );
      if (!cc) {
        setFeedback(
          buildFeedback(
            "College required",
            "Your profile must have a college before you can post announcements.",
            "error",
          ),
        );
        return;
      }
    }

    if (isAdmin && adminAudience === "colleges_cross") {
      if (selectedCollegeCodes.length === 0) {
        setFeedback(
          buildFeedback(
            "Select colleges",
            "Pick at least one college for this announcement.",
            "error",
          ),
        );
        return;
      }
    }

    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (selectedImageUri) {
        const path = `announcements/${user.id}/${Date.now()}.jpg`;
        imageUrl = await uploadImage(path, selectedImageUri);
      }

      let input: CreateAnnouncementInput;

      if (isCounselor) {
        const cc = resolveCollegeCodeFromUserData(
          user as unknown as Record<string, unknown>,
        ) as CollegeCode;
        input = {
          title: t,
          content: c,
          imageUrl,
          publisherRole: "counselor",
          visibility: "students_one_college",
          collegeCodes: [cc],
          createdBy: user.id,
          createdByName: user.full_name || user.preferred_name || "Unknown",
        };
      } else if (isAdmin) {
        const visibility =
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
          title: t,
          content: c,
          imageUrl,
          publisherRole: "admin",
          visibility,
          collegeCodes,
          createdBy: user.id,
          createdByName: user.full_name || user.preferred_name || "Admin",
        };
      } else {
        setFeedback(
          buildFeedback("Not allowed", "Only admins and counselors can post.", "error"),
        );
        return;
      }

      await announcementsService.create(input);
      setTitle("");
      setContent("");
      setSelectedImageUri(null);
      setAdminAudience("students_all");
      setSelectedCollegeCodes([]);
      onSuccess?.();
      onClose();
    } catch {
      setFeedback(
        buildFeedback("Error", "Failed to create announcement. Please try again.", "error"),
      );
    } finally {
      setSaving(false);
    }
  };

  const adminAudienceOptions: { key: AdminAudience; label: string }[] = [
    { key: "students_all", label: "All students" },
    { key: "counselors_all", label: "All counselors" },
    { key: "colleges_cross", label: "Selected colleges" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>New Announcement</Text>
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
            keyboardDismissMode="on-drag"
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
              <View style={styles.imagePreviewWrap}>
                <Image
                  source={{ uri: selectedImageUri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={handleRemoveImage}
                  style={styles.removeImageBtn}
                >
                  <X size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickImage}
                style={styles.pickImageBtn}
              >
                <Camera size={24} color={AURORA.blue} />
                <Text style={styles.pickImageText}>Add image from gallery</Text>
              </TouchableOpacity>
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

            {isCounselor && (
              <Text style={styles.hint}>
                Students and counselors in your college will see this on their
                dashboards. Admins can see all announcements.
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
                      Students and counselors in the colleges you select will see
                      this.
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
                {saving ? "Publishing..." : "Publish"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        <InfoGuideOverlay guide={feedback} onClose={() => setFeedback(null)} />
      </KeyboardAvoidingView>
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
  scrollContent: { padding: 20, paddingTop: 16, paddingBottom: 32 },
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
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
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
