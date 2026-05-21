import React from "react";
import {
  ActivityIndicator,
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

export type AuroraConfirmModalProps = {
  visible: boolean;
  title: string;
  body: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

/**
 * Two-action confirmation — InfoGuide card + SignOut pill buttons.
 * Use the overlay inside another Modal; use the Modal export at screen root.
 */
export function AuroraConfirmOverlay({
  visible,
  title,
  body,
  cancelLabel = "Cancel",
  confirmLabel = "Continue",
  onCancel,
  onConfirm,
  busy = false,
}: AuroraConfirmModalProps) {
  if (!visible) return null;

  const handleCancel = () => {
    if (busy) return;
    triggerHaptic("light");
    onCancel();
  };

  const handleConfirm = () => {
    if (busy) return;
    triggerHaptic("medium");
    onConfirm();
  };

  return (
    <View
      style={[StyleSheet.absoluteFillObject, styles.overlayRoot]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handleCancel}
        disabled={busy}
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={styles.card}
          accessibilityViewIsModal
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={busy}
              activeOpacity={0.85}
              style={[styles.btn, styles.btnCancel]}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.btnText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={busy}
              activeOpacity={0.85}
              style={[styles.btn, styles.btnConfirm, busy && styles.btnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              {busy ? (
                <ActivityIndicator size="small" color={AURORA.textPrimary} />
              ) : (
                <Text style={styles.btnText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}

export function AuroraConfirmModal(props: AuroraConfirmModalProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={props.visible}
      onRequestClose={props.busy ? undefined : props.onCancel}
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      statusBarTranslucent
    >
      <AuroraConfirmOverlay {...props} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    zIndex: 1000,
    elevation: 32,
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
    marginBottom: 10,
  },
  body: {
    color: AURORA.textSec,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: AURORA.cardDark,
    borderWidth: 1,
    borderColor: AURORA.border,
  },
  btnCancel: {},
  btnConfirm: {
    backgroundColor: "rgba(124,58,237,0.18)",
    borderColor: "rgba(124,58,237,0.45)",
  },
  btnText: {
    color: AURORA.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
