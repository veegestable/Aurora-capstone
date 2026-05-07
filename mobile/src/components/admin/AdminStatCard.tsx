import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText as Text } from "../common/AppText";
import { AURORA } from "../../constants/aurora-colors";

type AdminStatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  /** Highlight border when true (e.g. pending approvals > 0) */
  accent?: boolean;
};

export function AdminStatCard({
  label,
  value,
  icon,
  accent = false,
}: AdminStatCardProps) {
  return (
    <View
      style={[
        styles.card,
        { flex: 1 },
        accent && {
          borderColor: "rgba(245, 158, 11, 0.35)",
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    backgroundColor: AURORA.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AURORA.border,
    marginBottom: 12,
  },
  iconWrap: {
    marginBottom: 8,
  },
  value: {
    color: AURORA.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginLeft: 10,
  },
  label: {
    color: AURORA.textSec,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
});
