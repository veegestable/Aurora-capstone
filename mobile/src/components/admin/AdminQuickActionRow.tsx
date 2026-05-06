import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { AURORA } from "../../constants/aurora-colors";

type AdminQuickActionRowProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconContainerStyle: ViewStyle;
  onPress: () => void;
};

export function AdminQuickActionRow({
  title,
  description,
  icon,
  iconContainerStyle,
  onPress,
}: AdminQuickActionRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.iconCircle, iconContainerStyle]}>{icon}</View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <ChevronRight size={20} color={AURORA.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: AURORA.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: AURORA.border,
    marginBottom: 10,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: AURORA.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    color: AURORA.textSec,
    fontSize: 13,
    marginTop: 2,
  },
});
