import { AppText as Text } from "../common/AppText";
import { View, ActivityIndicator } from "react-native";
import { AURORA } from "../../constants/aurora-colors";
import type { StudentCounselingOutcomeCounts } from "../../services/trusted-backend.service";

type Props = {
  counts: StudentCounselingOutcomeCounts | null;
  loading?: boolean;
};

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "orange";
}) {
  const colors =
    tone === "green"
      ? {
          bg: "rgba(34,197,94,0.14)",
          border: "rgba(34,197,94,0.28)",
          text: "#86EFAC",
        }
      : {
          bg: "rgba(249,115,22,0.14)",
          border: "rgba(249,115,22,0.28)",
          text: "#FDBA74",
        };

  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 11, fontWeight: "800" }}>
        {value} {label}
      </Text>
    </View>
  );
}

export function StudentCounselingHistorySummary({ counts, loading }: Props) {
  if (loading) {
    return (
      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: AURORA.border,
          backgroundColor: AURORA.card,
          paddingVertical: 14,
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={AURORA.blue} size="small" />
      </View>
    );
  }

  const completed = counts?.completed ?? 0;
  const missed = counts?.missed ?? 0;
  const withYouCompleted = counts?.withYouCompleted ?? 0;
  const withYouMissed = counts?.withYouMissed ?? 0;
  const showWithYou =
    withYouCompleted !== completed ||
    withYouMissed !== missed ||
    withYouCompleted > 0 ||
    withYouMissed > 0;

  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: AURORA.border,
        backgroundColor: AURORA.card,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}>
            Counseling history
          </Text>
          <Text
            style={{
              color: AURORA.textMuted,
              fontSize: 10,
              marginTop: 2,
              lineHeight: 14,
            }}
          >
            All counselors at your college
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6, flexShrink: 0 }}>
          <StatPill label="done" value={completed} tone="green" />
          <StatPill label="missed" value={missed} tone="orange" />
        </View>
      </View>
      {showWithYou ? (
        <Text
          style={{
            color: AURORA.textSec,
            fontSize: 10,
            marginTop: 8,
          }}
        >
          With you: {withYouCompleted} completed · {withYouMissed} missed
        </Text>
      ) : null}
    </View>
  );
}
