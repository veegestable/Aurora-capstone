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
import { LogOut } from "lucide-react-native";
import { AppText as Text } from "./AppText";
import { AURORA } from "../../constants/aurora-colors";
import { triggerHaptic } from "../../utils/haptics";

type SignOutConfirmModalProps = {
  visible: boolean;
  onStay: () => void;
  onLeave: () => void | Promise<void>;
  leaving?: boolean;
};

/**
 * Logout confirmation — same card/overlay palette as InfoGuideModal, with sign-out accents.
 */
export function SignOutConfirmOverlay({
  visible,
  onStay,
  onLeave,
  leaving = false,
}: SignOutConfirmModalProps) {
  if (!visible) return null;

  const handleStay = () => {
    if (leaving) return;
    triggerHaptic("light");
    onStay();
  };

  const handleLeave = () => {
    if (leaving) return;
    triggerHaptic("medium");
    void onLeave();
  };

  return (
    <View
      style={[StyleSheet.absoluteFillObject, styles.overlayRoot]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handleStay}
        disabled={leaving}
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel="Dismiss sign out"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={styles.card}
          accessibilityViewIsModal
        >
          <View style={styles.iconWrap}>
            <LogOut size={42} color={AURORA.red} strokeWidth={2.25} />
          </View>

          <Text style={styles.title}>Sign out?</Text>
          <Text style={styles.body}>
            Are you sure you want to sign out? You will need to sign in again to
            continue using Aurora.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleStay}
              disabled={leaving}
              activeOpacity={0.85}
              style={[styles.btn, styles.btnStay]}
              accessibilityRole="button"
              accessibilityLabel="No, stay"
            >
              <Text style={styles.btnStayText}>No, stay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLeave}
              disabled={leaving}
              activeOpacity={0.85}
              style={[styles.btn, styles.btnLeave, leaving && styles.btnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Yes, leave"
            >
              {leaving ? (
                <ActivityIndicator size="small" color={AURORA.red} />
              ) : (
                <Text style={styles.btnLeaveText}>Yes, leave</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}

export function SignOutConfirmModal(props: SignOutConfirmModalProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={props.visible}
      onRequestClose={props.leaving ? undefined : props.onStay}
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      statusBarTranslucent
    >
      <SignOutConfirmOverlay {...props} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    zIndex: 100,
    elevation: 24,
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
  iconWrap: {
    alignSelf: "center",
    width: 58,
    height: 58,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    color: AURORA.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  body: {
    color: AURORA.textSec,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
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
  },
  btnStay: {
    backgroundColor: "rgba(124,58,237,0.18)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.45)",
  },
  btnStayText: {
    color: AURORA.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  btnLeave: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.45)",
  },
  btnLeaveText: {
    color: AURORA.red,
    fontSize: 13,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
