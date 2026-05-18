import React from "react";
import { View } from "react-native";
import { AppText as Text } from "../common/AppText";
import { AURORA } from "../../constants/aurora-colors";
import { getPastCollegeThreadBannerText } from "../../utils/conversationCollegeMessaging";

export default function ConversationReadOnlyBanner({
  role,
}: {
  role: "counselor" | "student";
}) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 4,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "rgba(251,191,36,0.12)",
        borderWidth: 1,
        borderColor: "rgba(251,191,36,0.35)",
      }}
    >
      <Text
        style={{
          color: "#FCD34D",
          fontSize: 12,
          fontWeight: "700",
          marginBottom: 4,
          letterSpacing: 0.3,
        }}
      >
        READ-ONLY
      </Text>
      <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 18 }}>
        {getPastCollegeThreadBannerText(role)}
      </Text>
    </View>
  );
}
