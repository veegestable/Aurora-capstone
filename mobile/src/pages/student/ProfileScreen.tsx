import React, { useState, useEffect, useMemo } from "react";
import { View, ScrollView, TouchableOpacity, Switch, Alert, Modal, Platform, ActivityIndicator, KeyboardAvoidingView } from "react-native";
import { AppText as Text } from "../../components/common/AppText";
import { AppTextInput as TextInput } from "../../components/common/AppTextInput";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AndroidWheelTimePicker } from "../../components/common/AndroidWheelTimePicker";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  X,
  Camera,
  Eye,
  Lock,
  Bell,
  LogOut,
  User,
  UtensilsCrossed,
  ChevronDown,
  ChevronRight,
  Sunrise,
  Droplets,
  GraduationCap,
} from "lucide-react-native";
import { useAuth } from "../../stores/AuthContext";
import { useUserDaySettings } from "../../stores/UserDaySettingsContext";
import { AURORA } from "../../constants/aurora-colors";
import { LetterAvatar } from "../../components/common/LetterAvatar";
import {
  InfoGuideModal,
  type InfoGuideContent,
} from "../../components/common/InfoGuideModal";
import { SignOutConfirmModal } from "../../components/common/SignOutConfirmModal";
import {
  clearDailyCheckInReminder,
  hasNotificationPermission,
  scheduleDailyCheckInReminder
} from "../../services/push-notifications.service";
import { syncExpoPushTokenToUserDoc } from "../../services/expo-push-token.service";
import {
  formatCounselorStudentSubtitle,
  formatYearLevelForDisplay,
} from "../../constants/ccs-student-programs";
import {
  COLLEGES,
  type CollegeCode,
  resolveCollegeCodeFromUserData,
  getCollegeName,
  isCollegeCode,
} from "../../constants/colleges";
import {
  getProgramsForCollege,
  isProgramInCollege,
} from "../../constants/college-programs-iit";
import { firestoreService } from "../../services/firebase-firestore.service";
import { COUNSELOR_VISIBLE_CHECKIN_SUMMARY } from "../../constants/counselor-checkin-policy";
import type { MealScheduleItem } from "../../services/mood-firestore-v2.service";

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  title,
}: {
  icon?: React.ReactNode;
  title: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
        marginTop: 20,
      }}
    >
      {icon}
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 12,
          fontWeight: "800",
          letterSpacing: 1.5,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: AURORA.border,
      }}
    >
      <Text
        style={{
          color: "#95A8D4",
          fontSize: 11,
          marginBottom: 4,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 15,
          fontWeight: "500",
          lineHeight: 21,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  rightElement,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: AURORA.border,
        marginBottom: 4,
      }}
    >
      <View style={{ width: 34, alignItems: "center", marginRight: 14 }}>
        {icon}
      </View>
      <Text
        style={{ flex: 1, color: "#FFFFFF", fontSize: 15, fontWeight: "500" }}
      >
        {label}
      </Text>
      {rightElement ||
        (onPress ? <ChevronRight size={18} color={AURORA.textMuted} /> : null)}
    </TouchableOpacity>
  );
}

// ─── Privacy Row ─────────────────────────────────────────────────────────────
function PrivacyRow({
  icon,
  title,
  description,
  preview,
  expanded,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  preview: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onToggle}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: AURORA.border,
        gap: 12,
      }}
    >
      <View style={{ marginTop: 2 }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: "600",
            marginBottom: 3,
          }}
        >
          {title}
        </Text>
        <Text style={{ color: AURORA.textSec, fontSize: 12, lineHeight: 17 }}>
          {expanded ? description : preview}
        </Text>
      </View>
      {expanded ? (
        <ChevronDown
          size={16}
          color={AURORA.textMuted}
          style={{ marginTop: 2 }}
        />
      ) : (
        <ChevronRight
          size={16}
          color={AURORA.textMuted}
          style={{ marginTop: 2 }}
        />
      )}
    </TouchableOpacity>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({
  icon,
  label,
  value,
  onValueChange,
  disabled,
  statusBadge,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  statusBadge?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: AURORA.border,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <View style={{ marginRight: 12 }}>{icon}</View>
      <Text
        style={{ flex: 1, color: "#FFFFFF", fontSize: 14, fontWeight: "500" }}
      >
        {label}
      </Text>
      {statusBadge ? (
        <View
          style={{
            marginRight: 10,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: value
              ? "rgba(34,197,94,0.45)"
              : "rgba(148,163,184,0.45)",
            backgroundColor: value
              ? "rgba(34,197,94,0.14)"
              : "rgba(148,163,184,0.14)",
          }}
        >
          <Text
            style={{
              color: value ? "#86EFAC" : "#B6C2DA",
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 0.3,
            }}
          >
            {statusBadge}
          </Text>
        </View>
      ) : null}
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: AURORA.cardAlt, true: AURORA.blue }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

type SexOption = "male" | "female";

// ─── Edit Profile Modal (name, sex, avatar) ──────────────────────────────────────
function EditProfileModal({
  visible,
  onClose,
  user,
  onSave,
  onPickAvatar,
}: {
  visible: boolean;
  onClose: () => void;
  user: any;
  onSave: (data: {
    preferredName: string;
    sex?: SexOption;
    yearLevel: string;
    studentNumber: string;
    contactNumber: string;
  }) => void;
  onPickAvatar?: (imageUri: string) => Promise<void>;
}) {
  const [name, setName] = useState(
    user?.preferred_name || user?.full_name || "",
  );
  const [sex, setSex] = useState<SexOption | undefined>(user?.sex);
  const [yearLevel, setYearLevel] = useState(user?.year_level || "");
  const [studentNumber, setStudentNumber] = useState(
    user?.student_number || "",
  );
  const [contactNumber, setContactNumber] = useState(
    user?.contact_number || "",
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setName(user.preferred_name || user.full_name || "");
      setSex(user.sex ?? undefined);
      setYearLevel(user.year_level || "");
      setStudentNumber(user.student_number || "");
      setContactNumber(user.contact_number || "");
    }
  }, [visible, user]);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library to add a profile picture.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri && onPickAvatar) {
      setUploadingAvatar(true);
      try {
        await onPickAvatar(result.assets[0].uri);
      } catch {
        Alert.alert(
          "Upload failed",
          "Could not upload profile picture. Please try again.",
        );
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSave = () => {
    const yearTrim = yearLevel.trim();
    const studentNumTrim = studentNumber.trim();
    const contactTrim = contactNumber.trim();
    if (!yearTrim) {
      Alert.alert(
        "Required field",
        "Please enter your year level (e.g. 1st Year, 2nd Year).",
      );
      return;
    }
    if (!studentNumTrim) {
      Alert.alert("Required field", "Please enter your student number.");
      return;
    }
    if (!contactTrim) {
      Alert.alert("Required field", "Please enter your contact number.");
      return;
    }
    if (contactTrim.length < 7) {
      Alert.alert(
        "Invalid number",
        "Contact number should be at least 7 digits.",
      );
      return;
    }
    onSave({
      preferredName: name.trim() || user?.full_name || "Student",
      sex,
      yearLevel: yearTrim,
      studentNumber: studentNumTrim,
      contactNumber: contactTrim,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: AURORA.border,
            }}
          >
            <TouchableOpacity onPress={onClose}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <X size={18} color={AURORA.textSec} />
                <Text style={{ color: AURORA.textSec, fontSize: 15 }}>
                  Cancel
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
              Edit Profile
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text
                style={{ color: AURORA.blue, fontSize: 15, fontWeight: "700" }}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
            >
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <View style={{ position: "relative" }}>
                <LetterAvatar
                  name={user?.preferred_name || user?.full_name || "Student"}
                  size={90}
                  avatarUrl={user?.avatar_url}
                />
                <TouchableOpacity
                  onPress={handlePickAvatar}
                  disabled={uploadingAvatar}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: AURORA.blue,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: AURORA.bgDeep,
                  }}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Camera size={14} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
              <Text
                style={{ color: AURORA.textSec, fontSize: 13, marginTop: 8 }}
              >
                MSU-IIT · College and program are changed via “Request college / program change”
              </Text>
            </View>

            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Name
            </Text>
            <View
              style={{
                backgroundColor: AURORA.card,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: AURORA.border,
              }}
            >
              <User
                size={16}
                color={AURORA.textSec}
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={{
                  flex: 1,
                  color: "#FFFFFF",
                  fontSize: 15,
                  paddingVertical: 14,
                }}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={AURORA.textMuted}
              />
            </View>

            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Year Level <Text style={{ color: AURORA.red }}>*</Text>
            </Text>
            <View
              style={{
                backgroundColor: AURORA.card,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: AURORA.border,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  color: "#FFFFFF",
                  fontSize: 15,
                  paddingVertical: 14,
                }}
                value={yearLevel}
                onChangeText={setYearLevel}
                placeholder="e.g. 1st Year, 2nd Year"
                placeholderTextColor={AURORA.textMuted}
              />
            </View>

            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Student Number <Text style={{ color: AURORA.red }}>*</Text>
            </Text>
            <View
              style={{
                backgroundColor: AURORA.card,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: AURORA.border,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  color: "#FFFFFF",
                  fontSize: 15,
                  paddingVertical: 14,
                }}
                value={studentNumber}
                onChangeText={setStudentNumber}
                placeholder="e.g. 2021-0001"
                placeholderTextColor={AURORA.textMuted}
                keyboardType="default"
              />
            </View>

            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Contact number <Text style={{ color: AURORA.red }}>*</Text>
            </Text>
            <View
              style={{
                backgroundColor: AURORA.card,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: AURORA.border,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  color: "#FFFFFF",
                  fontSize: 15,
                  paddingVertical: 14,
                }}
                value={contactNumber}
                onChangeText={setContactNumber}
                placeholder="Mobile phone (e.g. 09XXXXXXXXX)"
                placeholderTextColor={AURORA.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Sex
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => setSex("male")}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: sex === "male" ? AURORA.blue : AURORA.border,
                  backgroundColor:
                    sex === "male" ? "rgba(45,107,255,0.15)" : AURORA.card,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: sex === "male" ? "#FFFFFF" : AURORA.textSec,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSex("female")}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: sex === "female" ? AURORA.blue : AURORA.border,
                  backgroundColor:
                    sex === "female" ? "rgba(45,107,255,0.15)" : AURORA.card,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: sex === "female" ? "#FFFFFF" : AURORA.textSec,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  Female
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              style={{ borderRadius: 18, overflow: "hidden" }}
            >
              <LinearGradient
                colors={["#4A00E0", "#8E2DE2", "#00C6FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 18, alignItems: "center" }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "800" }}
                >
                  Save Changes
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
function formatResetHourLabel(h: number, m = 0): string {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function hhmmToDate(hhmm: string, fallbackHhmm: string): Date {
  const raw = (hhmm || "").trim() || fallbackHhmm;
  const [hRaw, mRaw] = raw.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  const d = new Date();
  d.setHours(
    Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 7,
    Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0,
    0,
    0,
  );
  return d;
}

function dateToHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ProfileScreen() {
  const { user, signOut, updateUser, uploadAvatar, refreshUserProfile } =
    useAuth();
  const {
    reminderHour,
    reminderMinute,
    remindersEnabled,
    setReminderTime,
    setRemindersEnabled,
    mealSchedule,
    setMealSchedule,
    usualWakeTime,
    usualBathTime,
    setUsualWakeTime,
    setUsualBathTime,
    loading: settingsLoading,
  } = useUserDaySettings();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [collegeShiftOpen, setCollegeShiftOpen] = useState(false);
  const [shiftTargetCollege, setShiftTargetCollege] = useState<CollegeCode | "">(
    "",
  );
  const [shiftTargetProgram, setShiftTargetProgram] = useState("");
  const [shiftReason, setShiftReason] = useState("");
  const [shiftSubmitting, setShiftSubmitting] = useState(false);
  const [collegeShiftSubmittedGuide, setCollegeShiftSubmittedGuide] =
    useState<InfoGuideContent | null>(null);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [signOutLeaving, setSignOutLeaving] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
  const [showMeal, setMeal] = useState(false);
  const [bathScheduleOpen, setBath] = useState(false);
  const [wakeScheduleOpen, setWakeup] = useState(false);
  const [wakePickDate, setWakePickDate] = useState(() =>
    hhmmToDate("", "07:00"),
  );
  const [bathPickDate, setBathPickDate] = useState(() =>
    hhmmToDate("", "19:00"),
  );
  const [activeMealIndex, setActiveMealIndex] = useState<number | null>(null);
  const [androidPicker, setAndroidPicker] = useState<{
    visible: boolean;
    value: Date;
    title?: string;
    onSelect: (selected: Date) => void;
  }>({
    visible: false,
    value: new Date(),
    title: undefined,
    onSelect: () => {},
  });
  const [sessionPushEnabled, setSessionPushEnabled] = useState(true);
  const [savingSessionPushPreference, setSavingSessionPushPreference] =
    useState(false);
  const [devicePermissionGranted, setDevicePermissionGranted] = useState<
    boolean | null
  >(null);
  const [expandedPrivacyRow, setExpandedPrivacyRow] = useState<
    "visible" | "private" | null
  >("visible");
  const [mealDraft, setMealDraft] = useState<MealScheduleItem[]>([]);
  const profileCompletion = useMemo(() => {
    let score = 0;
    if (user?.preferred_name || user?.full_name) score += 20;
    if (user?.sex) score += 15;
    if (user?.program) score += 20;
    if (user?.year_level) score += 20;
    if (user?.student_number) score += 15;
    if (user?.contact_number?.trim()) score += 5;
    if (user?.avatar_url) score += 5;
    const cc = resolveCollegeCodeFromUserData(
      user as Record<string, unknown> | null,
    );
    if (cc) score += 5;
    return Math.min(score, 100);
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.preferred_name,
    user?.full_name,
    user?.sex,
    user?.program,
    user?.year_level,
    user?.student_number,
    user?.contact_number,
    user?.avatar_url,
    user?.college_code,
    user?.department,
  ]);

  const pickerValue = useMemo(() => {
    const d = new Date();
    d.setHours(reminderHour, reminderMinute, 0, 0);
    return d;
  }, [reminderHour, reminderMinute]);
  const mealTimePickerValue = useMemo(() => {
    const meal = activeMealIndex != null ? mealDraft[activeMealIndex] : null;
    const [hRaw, mRaw] = (meal?.time || "07:00").split(":");
    const h = Number(hRaw);
    const m = Number(mRaw);
    const d = new Date();
    d.setHours(
      Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 7,
      Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0,
      0,
      0,
    );
    return d;
  }, [activeMealIndex, mealDraft]);

  useEffect(() => {
    setMealDraft(Array.isArray(mealSchedule) ? mealSchedule : []);
  }, [mealSchedule]);

  useEffect(() => {
    if (wakeScheduleOpen)
      setWakePickDate(hhmmToDate(usualWakeTime, "07:00"));
  }, [wakeScheduleOpen, usualWakeTime]);

  useEffect(() => {
    if (bathScheduleOpen)
      setBathPickDate(hhmmToDate(usualBathTime, "19:00"));
  }, [bathScheduleOpen, usualBathTime]);

  const toFriendlyMealTime = (time: string) => {
    const [hRaw, mRaw] = (time || "").split(":");
    const h = Number(hRaw);
    const m = Number(mRaw);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
    const clampedHour = Math.max(0, Math.min(23, h));
    const clampedMinute = Math.max(0, Math.min(59, m));
    const period = clampedHour >= 12 ? "PM" : "AM";
    const hour12 = clampedHour % 12 || 12;
    return `${hour12}:${String(clampedMinute).padStart(2, "0")} ${period}`;
  };

  const openAndroidTimePicker = (
    value: Date,
    onSelect: (selected: Date) => void,
    title?: string,
  ) => {
    setAndroidPicker({
      visible: true,
      value,
      title,
      onSelect,
    });
  };

  const closeAndroidTimePicker = () => {
    setAndroidPicker((prev) => ({ ...prev, visible: false }));
  };

  const normalizeMealCount = (count: number, base: MealScheduleItem[]) => {
    const nextCount = Math.max(1, Math.min(6, Math.floor(count)));
    const current = [...base];
    if (current.length === nextCount) return current;
    if (current.length > nextCount) return current.slice(0, nextCount);
    const start = current.length;
    for (let i = start; i < nextCount; i++) {
      current.push({
        id: `meal_${i + 1}`,
        label: `Meal ${i + 1}`,
        time: "",
      });
    }
    return current;
  };

  const setMealCount = (count: number) => {
    setMealDraft((prev) => normalizeMealCount(count, prev));
  };

  const updateMealTime = (idx: number, hour: number, minute = 0) => {
    setMealDraft((prev) =>
      prev.map((meal, i) =>
        i === idx
          ? {
              ...meal,
              time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
            }
          : meal,
      ),
    );
  };

  const saveMealSchedule = async (): Promise<boolean> => {
    if (!mealDraft.length) return false;
    const hasMissingTime = mealDraft.some((meal) => !meal.time?.trim());
    if (hasMissingTime) {
      Alert.alert(
        "Set all meal times",
        "Please set a time for each meal before saving.",
      );
      return false;
    }
    try {
      await setMealSchedule(mealDraft);
      Alert.alert("Saved", "Meal schedule updated for your check-ins.");
      return true;
    } catch {
      Alert.alert("Could not save", "Please try again.");
      return false;
    }
  };

  const handleSaveMealScheduleAndClose = async () => {
    const ok = await saveMealSchedule();
    if (ok) {
      setMeal(false);
      setActiveMealIndex(null);
    }
  };

  const openMealTimePicker = (idx: number) => {
    if (Platform.OS === "android") {
      const meal = mealDraft[idx];
      openAndroidTimePicker(
        hhmmToDate(meal?.time || "", "07:00"),
        (selected) => {
          updateMealTime(idx, selected.getHours(), selected.getMinutes());
        },
        meal?.label ? `${meal.label} time` : "Meal time",
      );
      return;
    }
    setActiveMealIndex(idx);
  };

  const handleSignOutPress = () => {
    setSignOutModalVisible(true);
  };

  const handleSignOutStay = () => {
    if (signOutLeaving) return;
    setSignOutModalVisible(false);
  };

  const handleSignOutLeave = async () => {
    if (signOutLeaving) return;
    setSignOutLeaving(true);
    try {
      await signOut();
      setSignOutModalVisible(false);
    } catch {
      /* auth layer logs errors */
    } finally {
      setSignOutLeaving(false);
    }
  };

  useEffect(() => {
    if (settingsLoading) return;
    const run = async () => {
      if (!remindersEnabled) {
        await clearDailyCheckInReminder();
        return;
      }
      const ok = await scheduleDailyCheckInReminder(reminderHour, reminderMinute);
      if (!ok) {
        Alert.alert(
          "Notifications disabled",
          "Please allow notification permission so Aurora can remind you on your phone.",
        );
      }
    };
    void run();
  }, [remindersEnabled, reminderHour, reminderMinute, settingsLoading]);

  useEffect(() => {
    if (!user) return;
    setSessionPushEnabled(user.session_push_notifications_enabled !== false);
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const granted = await hasNotificationPermission();
        if (mounted) setDevicePermissionGranted(granted);
      } catch {
        if (mounted) setDevicePermissionGranted(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleSessionPush = async (value: boolean) => {
    if (savingSessionPushPreference) return;
    const previous = sessionPushEnabled;
    setSessionPushEnabled(value);
    setSavingSessionPushPreference(true);
    try {
      await updateUser({ session_push_notifications_enabled: value });
      if (value && user?.id) void syncExpoPushTokenToUserDoc(user.id);
    } catch {
      setSessionPushEnabled(previous);
      Alert.alert("Could not update setting", "Please try again.");
    } finally {
      setSavingSessionPushPreference(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingVertical: 14,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
            Settings
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 62 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Avatar + Name ─────────────────────────────────────── */}
          <View style={{ alignItems: "center", marginBottom: 8, marginTop: 4 }}>
            <View style={{ position: "relative", marginBottom: 10 }}>
              <View
                style={{
                  borderWidth: 3,
                  borderColor: AURORA.blue,
                  borderRadius: 43,
                }}
              >
                <LetterAvatar
                  name={user?.preferred_name || user?.full_name || "Student"}
                  size={80}
                  avatarUrl={user?.avatar_url}
                />
              </View>
            </View>
            <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800" }}>
              {user?.preferred_name || user?.full_name || "Student"}
            </Text>
            <Text
              style={{
                color: "#A8B8DC",
                fontSize: 13,
                marginTop: 3,
                textAlign: "center",
              }}
            >
              {formatCounselorStudentSubtitle({
                college_code: user?.college_code,
                department: user?.department,
                program: user?.program,
                year_level: user?.year_level,
              }) || "MSU-IIT student"}
            </Text>
            <Text
              style={{ color: AURORA.textMuted, fontSize: 12, marginTop: 5 }}
            >
              Profile {profileCompletion}% complete
            </Text>
          </View>

          {/* ── Account Settings ──────────────────────────────── */}

          <SectionHeader title="ACCOUNT SETTINGS" />

          <View
            style={{
              backgroundColor: AURORA.card,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: AURORA.border,
            }}
          >
            {/* <SettingsRow
                            icon={<Lock size={18} color={AURORA.textSec} />}
                            label="Security & Password"
                            onPress={() => { }}
                        /> */}
            <SettingsRow
              icon={<User size={18} color={AURORA.textSec} />}
              label="Edit Profile"
              onPress={() => setShowEditProfile(true)}
            />
            {resolveCollegeCodeFromUserData(
              user as Record<string, unknown> | null,
            ) &&
            !user?.college_shift_pending ? (
              <SettingsRow
                icon={<GraduationCap size={18} color={AURORA.textSec} />}
                label="Request college / program change"
                onPress={() => {
                  setShiftTargetCollege("");
                  setShiftTargetProgram("");
                  setShiftReason("");
                  setCollegeShiftOpen(true);
                }}
              />
            ) : null}
            {user?.college_shift_pending ? (
              <View
                style={{
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: AURORA.border,
                }}
              >
                <Text
                  style={{
                    color: "#F59E0B",
                    fontSize: 13,
                    fontWeight: "700",
                    marginBottom: 4,
                  }}
                >
                  College change pending review
                </Text>
                <Text style={{ color: AURORA.textSec, fontSize: 12, lineHeight: 18 }}>
                  An administrator is reviewing your request. You will keep your
                  current college until it is approved.
                </Text>
              </View>
            ) : null}
            <SettingsRow
              icon={<UtensilsCrossed size={18} color={AURORA.textSec} />}
              label="Meal Schedule"
              onPress={() => setMeal(true)}
            />
            <SettingsRow
              icon={<Droplets size={18} color={AURORA.textSec} />}
              label="Bath schedule"
              onPress={() => setBath(true)}
              rightElement={
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Text
                    style={{
                      color: usualBathTime ? AURORA.blue : AURORA.textMuted,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {usualBathTime ? toFriendlyMealTime(usualBathTime) : "Set"}
                  </Text>
                  <ChevronRight size={18} color={AURORA.textMuted} />
                </View>
              }
            />
            <SettingsRow
              icon={<Sunrise size={18} color={AURORA.textSec} />}
              label="Wake-up schedule"
              onPress={() => setWakeup(true)}
              rightElement={
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Text
                    style={{
                      color: usualWakeTime ? AURORA.blue : AURORA.textMuted,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {usualWakeTime ? toFriendlyMealTime(usualWakeTime) : "Set"}
                  </Text>
                  <ChevronRight size={18} color={AURORA.textMuted} />
                </View>
              }
            />
          </View>

          {/* ── Personal Details ─────────────────────────────────── */}
          <SectionHeader title="PERSONAL DETAILS" />
          <View
            style={{
              backgroundColor: AURORA.card,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: AURORA.border,
            }}
          >
            <InfoRow label="Full Name" value={user?.full_name || "Student"} />
            <InfoRow
              label="Sex"
              value={
                user?.sex
                  ? user.sex === "male"
                    ? "Male"
                    : "Female"
                  : "Not set"
              }
            />
            <InfoRow
              label="College"
              value={
                (() => {
                  const c = resolveCollegeCodeFromUserData(
                    user as Record<string, unknown> | null,
                  );
                  return c ? `${c} — ${getCollegeName(c)}` : "Not set";
                })()
              }
            />
            <InfoRow
              label="Program"
              value={user?.program || "Not set"}
            />
            <InfoRow
              label="Year level"
              value={
                user?.year_level
                  ? formatYearLevelForDisplay(user.year_level)
                  : "Not set"
              }
            />
            <InfoRow
              label="Student Number"
              value={user?.student_number || "Not set"}
            />
            <InfoRow
              label="Contact number"
              value={user?.contact_number || "Not set"}
            />
            {/* <Text
              style={{
                color: AURORA.textMuted,
                fontSize: 11,
                lineHeight: 16,
                paddingTop: 8,
                paddingBottom: 10,
              }}
            >
              Student number is used for school identity verification. Contact
              number is for scheduling and urgent reach-out only.
            </Text> */}
          </View>

          {/* ── Privacy Transparency ─────────────────────────────── */}
          <SectionHeader
            icon={<Lock size={14} color={AURORA.blue} />}
            title="PRIVACY TRANSPARENCY"
          />
          {/* <Text
            style={{
              color: AURORA.textMuted,
              fontSize: 12,
              lineHeight: 18,
              marginBottom: 8,
            }}
          >
            How guidance can use your check-ins in Aurora (no toggle — policy is fixed for now).
          </Text> */}
          <View
            style={{
              backgroundColor: AURORA.card,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: AURORA.border,
            }}
          >
            <PrivacyRow
              icon={<Eye size={18} color={AURORA.green} />}
              title="What counselors can see"
              preview="Date, time, and mood for recent check-ins; directory info for scheduling."
              expanded={expandedPrivacyRow === "visible"}
              onToggle={() =>
                setExpandedPrivacyRow((prev) =>
                  prev === "visible" ? null : "visible",
                )
              }
              description={`${COUNSELOR_VISIBLE_CHECKIN_SUMMARY} Stress/energy trend tiles unlock for a counselor only when you are in their special population (you requested a session with them, or you accepted a session time they proposed). That is self-report data, not a diagnosis.`}
            />
            <PrivacyRow
              icon={<Lock size={18} color={AURORA.blue} />}
              title="What stays narrower until special population"
              preview="Notes, sleep, meals, bath, and photos stay off counselor views until then."
              expanded={expandedPrivacyRow === "private"}
              onToggle={() =>
                setExpandedPrivacyRow((prev) =>
                  prev === "private" ? null : "private",
                )
              }
              description="After special-population consent for that counselor, they can see the same journal detail you see in Aurora for support. There is no in-app switch to revoke that yet."
            />
          </View>

          {/* ── App Preferences ──────────────────────────────────── */}
          <SectionHeader title="APP PREFERENCES" />
          <View
            style={{
              backgroundColor: AURORA.card,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: AURORA.border,
            }}
          >
            <ToggleRow
              icon={<Bell size={18} color={AURORA.textSec} />}
              label="Session updates"
              statusBadge={sessionPushEnabled ? "ON" : "OFF"}
              value={sessionPushEnabled}
              disabled={savingSessionPushPreference}
              onValueChange={handleToggleSessionPush}
            />
            <ToggleRow
              icon={<Bell size={18} color={AURORA.textSec} />}
              label="Daily Check-in Reminders"
              value={remindersEnabled}
              onValueChange={(v) => {
                void setRemindersEnabled(v);
              }}
            />
            {/* <ToggleRow
                            icon={<Video size={18} color={AURORA.textSec} />}
                            label="Camera (Daily Selfie)"
                            value={aiCamera}
                            onValueChange={setAiCamera}
                        /> */}
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === "android") {
                  openAndroidTimePicker(
                    pickerValue,
                    (selected) => {
                      void setReminderTime(
                        selected.getHours(),
                        selected.getMinutes(),
                      );
                    },
                    "Reminder time",
                  );
                  return;
                }
                setShowReminderTimePicker(true);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: AURORA.border,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                Reminder time
              </Text>
              <Text
                style={{ color: AURORA.blue, fontSize: 14, fontWeight: "700" }}
              >
                {formatResetHourLabel(reminderHour, reminderMinute)}
              </Text>
              <ChevronRight
                size={16}
                color={AURORA.textMuted}
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
            {/* <Text
              style={{
                color: "#95A8D4",
                fontSize: 11,
                lineHeight: 16,
                marginTop: 8,
                marginBottom: 4,
              }}
            >
              We will remind you to start your day at this time (default 7:00
              AM).
            </Text>
            <Text
              style={{
                color: AURORA.textMuted,
                fontSize: 11,
                lineHeight: 16,
                marginTop: 2,
              }}
            >
              Session update notifications are best-effort on this app build.
            </Text> */}
            {sessionPushEnabled && devicePermissionGranted === false ? (
              <Text
                style={{
                  color: "#FECACA",
                  fontSize: 11,
                  lineHeight: 16,
                  marginTop: 4,
                }}
              >
                Device notifications are blocked in system settings, so session
                alerts may not appear.
              </Text>
            ) : null}
            {/* <TouchableOpacity
                            onPress={async () => {
                                const ok = await sendTestDailyCheckInNotification();
                                if (!ok) {
                                    Alert.alert(
                                        'Notifications disabled',
                                        'Please allow notification permission to receive the test reminder.'
                                    );
                                    return;
                                }
                                Alert.alert('Test sent', 'A test reminder was sent to your phone.');
                            }}
                            style={{
                                marginTop: 10,
                                marginBottom: 6,
                                paddingVertical: 10,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: 'rgba(45,107,255,0.24)',
                                backgroundColor: 'rgba(45,107,255,0.08)',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#9EB5EA', fontSize: 12, fontWeight: '600' }}>Send test notification now</Text>
                        </TouchableOpacity> */}
          </View>

          {Platform.OS === "ios" ? (
            <Modal
              visible={showReminderTimePicker}
              transparent
              animationType="slide"
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  justifyContent: "flex-end",
                  backgroundColor: "rgba(0,0,0,0.45)",
                }}
                activeOpacity={1}
                onPress={() => setShowReminderTimePicker(false)}
              >
                <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                  <View
                    style={{
                      backgroundColor: AURORA.card,
                      padding: 16,
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                      borderWidth: 1,
                      borderColor: AURORA.border,
                    }}
                  >
                    <DateTimePicker
                      value={pickerValue}
                      mode="time"
                      display="spinner"
                      onChange={(_e, date) => {
                        if (date)
                          void setReminderTime(
                            date.getHours(),
                            date.getMinutes(),
                          );
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowReminderTimePicker(false)}
                      style={{
                        marginTop: 12,
                        paddingVertical: 14,
                        borderRadius: 12,
                        backgroundColor: AURORA.blue,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          ) : null}
          <Modal visible={showMeal} transparent animationType="slide">
            <View
              style={{
                flex: 1,
                justifyContent: "flex-end",
                backgroundColor: "rgba(0,0,0,0.45)",
              }}
            >
              <TouchableOpacity
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
                activeOpacity={1}
                onPress={() => setMeal(false)}
              />
              <View
                style={{
                  backgroundColor: AURORA.card,
                  paddingHorizontal: 16,
                  paddingTop: 16,
                  paddingBottom: 20,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  borderWidth: 1,
                  borderColor: AURORA.border,
                  height: "88%",
                  minHeight: 420,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 16,
                    fontWeight: "700",
                    marginBottom: 8,
                  }}
                >
                  Meal Schedule
                </Text>
                <Text
                  style={{
                    color: "#9AAEDB",
                    fontSize: 12,
                    lineHeight: 18,
                    marginBottom: 10,
                  }}
                >
                  Set your daily meal count and usual meal times. Aurora will
                  ask these in mood check-ins.
                </Text>
                <ScrollView
                  style={{ flex: 1 }}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ paddingBottom: 14 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <View
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: AURORA.border,
                      backgroundColor: AURORA.cardAlt,
                      padding: 12,
                      marginBottom: 14,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 13,
                        fontWeight: "700",
                        marginBottom: 8,
                      }}
                    >
                      Meal count per day
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => setMealCount(mealDraft.length - 1)}
                        disabled={mealDraft.length <= 1}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor:
                            mealDraft.length <= 1 ? AURORA.border : AURORA.blue,
                          backgroundColor:
                            mealDraft.length <= 1
                              ? AURORA.card
                              : "rgba(45,107,255,0.16)",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: mealDraft.length <= 1 ? 0.55 : 1,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              mealDraft.length <= 1
                                ? AURORA.textMuted
                                : AURORA.blue,
                            fontSize: 18,
                            fontWeight: "700",
                          }}
                        >
                          -
                        </Text>
                      </TouchableOpacity>
                      <View style={{ flex: 1, alignItems: "center" }}>
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 18,
                            fontWeight: "800",
                          }}
                        >
                          {mealDraft.length}
                        </Text>
                        <Text style={{ color: AURORA.textMuted, fontSize: 11 }}>
                          meal{mealDraft.length === 1 ? "" : "s"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setMealCount(mealDraft.length + 1)}
                        disabled={mealDraft.length >= 6}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor:
                            mealDraft.length >= 6 ? AURORA.border : AURORA.blue,
                          backgroundColor:
                            mealDraft.length >= 6
                              ? AURORA.card
                              : "rgba(45,107,255,0.16)",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: mealDraft.length >= 6 ? 0.55 : 1,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              mealDraft.length >= 6
                                ? AURORA.textMuted
                                : AURORA.blue,
                            fontSize: 18,
                            fontWeight: "700",
                          }}
                        >
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {mealDraft.map((meal, idx) => (
                    <View
                      key={meal.id}
                      style={{
                        paddingVertical: 12,
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: AURORA.border,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <View>
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontSize: 14,
                              fontWeight: "700",
                            }}
                          >
                            {meal.label}
                          </Text>
                          <Text
                            style={{
                              color: AURORA.textSec,
                              fontSize: 12,
                              marginTop: 2,
                            }}
                          >
                            {meal.time
                              ? toFriendlyMealTime(meal.time)
                              : "No time set yet"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => openMealTimePicker(idx)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: AURORA.blue,
                            backgroundColor: "rgba(45,107,255,0.16)",
                          }}
                        >
                          <Text
                            style={{
                              color: AURORA.blue,
                              fontSize: 12,
                              fontWeight: "700",
                            }}
                          >
                            Set time
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                {activeMealIndex != null ? (
                  <View
                    style={{
                      marginTop: 8,
                      marginBottom: 10,
                      padding: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: AURORA.border,
                      backgroundColor: AURORA.cardAlt,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 13,
                        fontWeight: "700",
                        marginBottom: 6,
                      }}
                    >
                      Set time for {mealDraft[activeMealIndex]?.label || "meal"}
                    </Text>
                    <DateTimePicker
                      value={mealTimePickerValue}
                      mode="time"
                    display="spinner"
                      onChange={(_e, date) => {
                        if (date && activeMealIndex != null) {
                          updateMealTime(
                            activeMealIndex,
                            date.getHours(),
                            date.getMinutes(),
                          );
                        }
                        if (Platform.OS === "android") {
                          setActiveMealIndex(null);
                        }
                      }}
                    />
                    {Platform.OS === "ios" ? (
                      <TouchableOpacity
                        onPress={() => setActiveMealIndex(null)}
                        style={{
                          marginTop: 8,
                          alignSelf: "flex-end",
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: AURORA.blue,
                          backgroundColor: "rgba(45,107,255,0.16)",
                        }}
                      >
                        <Text
                          style={{
                            color: AURORA.blue,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          Done
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => setMeal(false)}
                    style={{
                      flex: 1,
                      paddingVertical: 11,
                      borderRadius: 10,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: AURORA.border,
                      backgroundColor: AURORA.cardAlt,
                    }}
                  >
                    <Text
                      style={{
                        color: AURORA.textSec,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      Close
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      void handleSaveMealScheduleAndClose();
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 11,
                      borderRadius: 10,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "rgba(45,107,255,0.45)",
                      backgroundColor: "rgba(45,107,255,0.16)",
                    }}
                  >
                    <Text
                      style={{
                        color: "#B9CCFF",
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            visible={wakeScheduleOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setWakeup(false)}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                justifyContent: "flex-end",
                backgroundColor: "rgba(0,0,0,0.45)",
              }}
              activeOpacity={1}
              onPress={() => setWakeup(false)}
            >
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View
                  style={{
                    backgroundColor: AURORA.card,
                    padding: 16,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    borderWidth: 1,
                    borderColor: AURORA.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        color: "#FFFFFF",
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      Wake-up schedule
                    </Text>
                    <TouchableOpacity
                      onPress={() => setWakeup(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Close wake-up schedule"
                      style={{ padding: 4, marginTop: -2 }}
                    >
                      <X size={22} color={AURORA.textSec} />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={{
                      color: "#9AAEDB",
                      fontSize: 12,
                      lineHeight: 18,
                      marginBottom: 12,
                    }}
                  >
                    Your usual wake time helps Aurora ask sleep and routine
                    questions at sensible moments (similar to meal times).
                  </Text>
                  {Platform.OS === "ios" ? (
                    <DateTimePicker
                      value={wakePickDate}
                      mode="time"
                      display="spinner"
                      onChange={(_e, date) => {
                        if (date) setWakePickDate(date);
                      }}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() =>
                        openAndroidTimePicker(
                          wakePickDate,
                          setWakePickDate,
                          "Usual wake-up time",
                        )
                      }
                      style={{
                        marginTop: 4,
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                        backgroundColor: AURORA.cardAlt,
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 16,
                          fontWeight: "700",
                          textAlign: "center",
                        }}
                      >
                        {toFriendlyMealTime(dateToHHmm(wakePickDate))}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        void (async () => {
                          try {
                            await setUsualWakeTime("");
                            Alert.alert("Cleared", "Wake-up time removed.");
                            setWakeup(false);
                          } catch {
                            Alert.alert("Could not save", "Please try again.");
                          }
                        })();
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: AURORA.border,
                        backgroundColor: AURORA.cardAlt,
                      }}
                    >
                      <Text
                        style={{
                          color: AURORA.textSec,
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        Clear
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        void (async () => {
                          try {
                            await setUsualWakeTime(dateToHHmm(wakePickDate));
                            Alert.alert("Saved", "Wake-up time saved.");
                            setWakeup(false);
                          } catch {
                            Alert.alert("Could not save", "Please try again.");
                          }
                        })();
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "rgba(45,107,255,0.45)",
                        backgroundColor: "rgba(45,107,255,0.16)",
                      }}
                    >
                      <Text
                        style={{
                          color: "#B9CCFF",
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          <Modal
            visible={bathScheduleOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setBath(false)}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                justifyContent: "flex-end",
                backgroundColor: "rgba(0,0,0,0.45)",
              }}
              activeOpacity={1}
              onPress={() => setBath(false)}
            >
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View
                  style={{
                    backgroundColor: AURORA.card,
                    padding: 16,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    borderWidth: 1,
                    borderColor: AURORA.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        color: "#FFFFFF",
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      Bath schedule
                    </Text>
                    <TouchableOpacity
                      onPress={() => setBath(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Close bath schedule"
                      style={{ padding: 4, marginTop: -2 }}
                    >
                      <X size={22} color={AURORA.textSec} />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={{
                      color: "#9AAEDB",
                      fontSize: 12,
                      lineHeight: 18,
                      marginBottom: 12,
                    }}
                  >
                    Your usual bath time helps Aurora prompt bath check-ins
                    around when you normally take one.
                  </Text>
                  {Platform.OS === "ios" ? (
                    <DateTimePicker
                      value={bathPickDate}
                      mode="time"
                      display="spinner"
                      onChange={(_e, date) => {
                        if (date) setBathPickDate(date);
                      }}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() =>
                        openAndroidTimePicker(
                          bathPickDate,
                          setBathPickDate,
                          "Usual bath time",
                        )
                      }
                      style={{
                        marginTop: 4,
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                        backgroundColor: AURORA.cardAlt,
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 16,
                          fontWeight: "700",
                          textAlign: "center",
                        }}
                      >
                        {toFriendlyMealTime(dateToHHmm(bathPickDate))}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        void (async () => {
                          try {
                            await setUsualBathTime("");
                            Alert.alert("Cleared", "Bath time removed.");
                            setBath(false);
                          } catch {
                            Alert.alert("Could not save", "Please try again.");
                          }
                        })();
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: AURORA.border,
                        backgroundColor: AURORA.cardAlt,
                      }}
                    >
                      <Text
                        style={{
                          color: AURORA.textSec,
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        Clear
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        void (async () => {
                          try {
                            await setUsualBathTime(dateToHHmm(bathPickDate));
                            Alert.alert("Saved", "Bath time saved.");
                            setBath(false);
                          } catch {
                            Alert.alert("Could not save", "Please try again.");
                          }
                        })();
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "rgba(45,107,255,0.45)",
                        backgroundColor: "rgba(45,107,255,0.16)",
                      }}
                    >
                      <Text
                        style={{
                          color: "#B9CCFF",
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          {/* ── Edit Profile Button ─────────────────────────────────
                    <TouchableOpacity
                        onPress={() => setShowEditProfile(true)}
                        style={{
                            backgroundColor: 'rgba(45,107,255,0.16)', borderRadius: 16,
                            padding: 16, alignItems: 'center', marginTop: 16,
                            borderWidth: 1, borderColor: 'rgba(45,107,255,0.45)',
                        }}
                    >
                        <Text style={{ color: '#C3D4FF', fontSize: 15, fontWeight: '700' }}>Edit Profile</Text>
                    </TouchableOpacity> */}

          {/* ── Logout ───────────────────────────────────────────── */}
          <TouchableOpacity
            onPress={handleSignOutPress}
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 12,
              gap: 8,
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.3)",
            }}
          >
            <LogOut size={18} color={AURORA.red} />
            <Text
              style={{ color: AURORA.red, fontSize: 15, fontWeight: "700" }}
            >
              Logout Account
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              color: AURORA.textMuted,
              fontSize: 11,
              textAlign: "center",
              marginTop: 8,
              marginBottom: 22,
            }}
          >
            You can sign back in anytime.
          </Text>
        </ScrollView>

        <Modal
          visible={collegeShiftOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => !shiftSubmitting && setCollegeShiftOpen(false)}
        >
          <View style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
            <SafeAreaView style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: AURORA.border,
                }}
              >
                <TouchableOpacity
                  onPress={() => !shiftSubmitting && setCollegeShiftOpen(false)}
                >
                  <Text style={{ color: AURORA.textSec, fontSize: 15 }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text
                  style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}
                >
                  College & program change
                </Text>
                <View style={{ width: 56 }} />
              </View>
              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={0}
              >
              <ScrollView
                contentContainerStyle={{
                  padding: 20,
                  paddingBottom: 120,
                }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <Text style={{ color: AURORA.textSec, fontSize: 13, marginBottom: 16 }}>
                  Pick the college (you can keep your current college to change program
                  only), then choose your degree program from that college's list. An
                  admin must approve before your profile updates.
                </Text>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: "600",
                    marginBottom: 8,
                  }}
                >
                  College
                </Text>
                {COLLEGES.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => {
                      setShiftTargetCollege(c.code);
                      setShiftTargetProgram("");
                    }}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor:
                        shiftTargetCollege === c.code
                          ? "rgba(45,107,255,0.55)"
                          : AURORA.border,
                      backgroundColor:
                        shiftTargetCollege === c.code
                          ? "rgba(45,107,255,0.14)"
                          : AURORA.card,
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
                      {c.code} — {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {shiftTargetCollege && isCollegeCode(shiftTargetCollege) ? (
                  <>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontWeight: "600",
                        marginTop: 16,
                        marginBottom: 8,
                      }}
                    >
                      Degree program
                    </Text>
                    {getProgramsForCollege(shiftTargetCollege).map((p) => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setShiftTargetProgram(p)}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 12,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor:
                            shiftTargetProgram === p
                              ? "rgba(45,107,255,0.55)"
                              : AURORA.border,
                          backgroundColor:
                            shiftTargetProgram === p
                              ? "rgba(45,107,255,0.14)"
                              : AURORA.card,
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 13,
                            fontWeight: shiftTargetProgram === p ? "700" : "500",
                            lineHeight: 19,
                          }}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                ) : null}
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: "600",
                    marginTop: 16,
                    marginBottom: 8,
                  }}
                >
                  Reason for change
                </Text>
                <TextInput
                  style={{
                    backgroundColor: AURORA.card,
                    borderRadius: 14,
                    padding: 14,
                    color: "#FFFFFF",
                    minHeight: 100,
                    textAlignVertical: "top",
                    borderWidth: 1,
                    borderColor: AURORA.border,
                  }}
                  placeholder="Explain your request (required, min. 8 characters)."
                  placeholderTextColor={AURORA.textMuted}
                  value={shiftReason}
                  onChangeText={setShiftReason}
                  multiline
                />
                <TouchableOpacity
                  disabled={shiftSubmitting}
                  onPress={() => {
                    void (async () => {
                      if (!user?.id) return;
                      if (!shiftTargetCollege || !isCollegeCode(shiftTargetCollege)) {
                        Alert.alert("College", "Select a college.");
                        return;
                      }
                      if (
                        !shiftTargetProgram.trim() ||
                        !isProgramInCollege(shiftTargetCollege, shiftTargetProgram)
                      ) {
                        Alert.alert(
                          "Program",
                          "Select a degree program from the list for that college.",
                        );
                        return;
                      }
                      const profileCollege = resolveCollegeCodeFromUserData(
                        user as unknown as Record<string, unknown> | null,
                      );
                      const currentProg =
                        typeof user?.program === "string"
                          ? user.program.trim()
                          : "";
                      if (
                        profileCollege &&
                        shiftTargetCollege === profileCollege &&
                        currentProg &&
                        shiftTargetProgram.trim() === currentProg
                      ) {
                        Alert.alert(
                          "Program",
                          "Choose a different degree program than your current one.",
                        );
                        return;
                      }
                      try {
                        setShiftSubmitting(true);
                        await firestoreService.submitCollegeShiftRequest(
                          user.id,
                          shiftTargetCollege,
                          shiftTargetProgram.trim(),
                          shiftReason,
                        );
                        await refreshUserProfile();
                        setCollegeShiftOpen(false);
                        setCollegeShiftSubmittedGuide({
                          title: "Submitted",
                          body: "Your request is pending admin review.",
                        });
                      } catch (e) {
                        Alert.alert(
                          "Could not submit",
                          e instanceof Error ? e.message : "Please try again.",
                        );
                      } finally {
                        setShiftSubmitting(false);
                      }
                    })();
                  }}
                  style={{
                    marginTop: 20,
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    backgroundColor: "rgba(45,107,255,0.2)",
                    borderWidth: 1,
                    borderColor: "rgba(45,107,255,0.45)",
                    opacity: shiftSubmitting ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "#C3D4FF", fontSize: 15, fontWeight: "700" }}>
                    {shiftSubmitting ? "Submitting…" : "Submit request"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </View>
        </Modal>

        <EditProfileModal
          visible={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          user={user}
          onSave={async (data) => {
            try {
              await updateUser({
                preferred_name: data.preferredName,
                sex: data.sex,
                year_level: data.yearLevel,
                student_number: data.studentNumber,
                contact_number: data.contactNumber,
              });
              await refreshUserProfile();
            } catch (e) {
              console.error("Failed to save profile:", e);
            }
          }}
          onPickAvatar={async (uri) => {
            await uploadAvatar(uri);
          }}
        />

        {Platform.OS === "android" ? (
          <AndroidWheelTimePicker
            visible={androidPicker.visible}
            value={androidPicker.value}
            title={androidPicker.title}
            onConfirm={(d) => androidPicker.onSelect(d)}
            onClose={closeAndroidTimePicker}
          />
        ) : null}

        <InfoGuideModal
          guide={collegeShiftSubmittedGuide}
          onClose={() => setCollegeShiftSubmittedGuide(null)}
        />

        <SignOutConfirmModal
          visible={signOutModalVisible}
          onStay={handleSignOutStay}
          onLeave={handleSignOutLeave}
          leaving={signOutLeaving}
        />
      </SafeAreaView>
    </View>
  );
}
