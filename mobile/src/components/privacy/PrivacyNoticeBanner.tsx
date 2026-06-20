import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ChevronRight, Lock } from "lucide-react-native";
import { AppText as Text } from "../common/AppText";
import { AURORA } from "../../constants/aurora-colors";
import { STUDENT_PRIVACY_BANNER_TEXT } from "../../constants/student-privacy";
import { useStudentPrivacy } from "../../stores/StudentPrivacyContext";

type PrivacyNoticeBannerProps = {
  /** Override default banner copy (e.g. messages screen). */
  message?: string;
  style?: { marginTop?: number; marginBottom?: number };
};

export function PrivacyNoticeBanner({
  message = STUDENT_PRIVACY_BANNER_TEXT,
  style,
}: PrivacyNoticeBannerProps) {
  const { openPrivacyAssurance } = useStudentPrivacy();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={openPrivacyAssurance}
      accessibilityRole="button"
      accessibilityLabel="Open privacy and data information"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "rgba(45,107,255,0.12)",
        borderWidth: 1,
        borderColor: "rgba(45,107,255,0.28)",
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginTop: style?.marginTop ?? 0,
        marginBottom: style?.marginBottom ?? 16,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: "rgba(45,107,255,0.2)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Lock size={14} color={AURORA.blue} />
      </View>
      <Text
        style={{
          flex: 1,
          color: AURORA.textSec,
          fontSize: 12,
          lineHeight: 17,
          fontWeight: "600",
        }}
      >
        {message}
      </Text>
      <ChevronRight size={16} color={AURORA.textMuted} />
    </TouchableOpacity>
  );
}
