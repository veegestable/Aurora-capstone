import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { AppText as Text } from "./AppText";
import { AURORA } from "../../constants/aurora-colors";
import { triggerHaptic } from "../../utils/haptics";

export type AuroraActionSheetItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

export type AuroraActionSheetContent = {
  title: string;
  body?: string;
  actions: AuroraActionSheetItem[];
  /** Bottom dismiss button; defaults to "Cancel". */
  dismissLabel?: string;
};

type AuroraActionSheetModalProps = {
  sheet: AuroraActionSheetContent | null;
  onClose: () => void;
};

type AuroraActionSheetOverlayProps = AuroraActionSheetModalProps & {
  /** When true, wait for a wrapping RN Modal to finish closing before running actions. */
  deferActions?: boolean;
};

export function AuroraActionSheetOverlay({
  sheet,
  onClose,
  deferActions = false,
}: AuroraActionSheetOverlayProps) {
  if (!sheet) return null;

  const dismissLabel = sheet.dismissLabel?.trim() || "Cancel";

  const runAction = (action: AuroraActionSheetItem) => {
    triggerHaptic("light");
    onClose();
    const invoke = () => {
      try {
        action.onPress();
      } catch (error) {
        console.warn("[AuroraActionSheet] action failed:", error);
      }
    };
    if (deferActions) {
      const delayMs = Platform.OS === "ios" ? 400 : 120;
      setTimeout(invoke, delayMs);
    } else {
      invoke();
    }
  };

  return (
    <View
      style={[StyleSheet.absoluteFillObject, styles.overlayRoot]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onClose}
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={styles.card}
        >
          <Text style={styles.title}>{sheet.title}</Text>
          {sheet.body ? <Text style={styles.body}>{sheet.body}</Text> : null}
          <View style={styles.actions}>
            {sheet.actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => runAction(action)}
                activeOpacity={0.85}
                style={[
                  styles.actionBtn,
                  action.destructive && styles.actionBtnDestructive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <Text
                  style={[
                    styles.actionText,
                    action.destructive && styles.actionTextDestructive,
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={[styles.actionBtn, styles.cancelBtn]}
            accessibilityRole="button"
            accessibilityLabel={dismissLabel}
          >
            <Text style={styles.actionText}>{dismissLabel}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </View>
  );
}

export function AuroraActionSheetModal({
  sheet,
  onClose,
}: AuroraActionSheetModalProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!sheet}
      onRequestClose={onClose}
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      statusBarTranslucent
    >
      <AuroraActionSheetOverlay
        sheet={sheet}
        onClose={onClose}
        deferActions
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    zIndex: 1100,
    elevation: 40,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(3,8,24,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: AURORA.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AURORA.border,
    padding: 16,
  },
  title: {
    color: AURORA.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  body: {
    color: AURORA.textSec,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  actions: {
    gap: 8,
    marginBottom: 8,
  },
  actionBtn: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: AURORA.cardDark,
    borderWidth: 1,
    borderColor: AURORA.border,
  },
  actionBtnDestructive: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.35)",
  },
  actionText: {
    color: AURORA.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  actionTextDestructive: {
    color: "#FCA5A5",
  },
  cancelBtn: {
    marginTop: 4,
  },
});
