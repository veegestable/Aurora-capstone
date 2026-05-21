import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { AlertCircle, CheckCircle2, Info } from "lucide-react-native";
import { AppText as Text } from "./AppText";
import { AURORA } from "../../constants/aurora-colors";
import { triggerHaptic } from "../../utils/haptics";
import { formatRetryCountdown } from "../../utils/rateLimitError";

export type AuroraMessageTone = "error" | "info" | "success";

export type AuroraMessageModalProps = {
  visible: boolean;
  title: string;
  body: string;
  tone?: AuroraMessageTone;
  okLabel?: string;
  /** When set, shows a live countdown instead of a static "wait Ns" in body. */
  retryAfterSeconds?: number | null;
  onDismiss: () => void;
};

const TONE_STYLES: Record<
  AuroraMessageTone,
  { icon: typeof AlertCircle; color: string; btnBg: string; btnBorder: string }
> = {
  error: {
    icon: AlertCircle,
    color: AURORA.red,
    btnBg: "rgba(239, 68, 68, 0.18)",
    btnBorder: "rgba(239, 68, 68, 0.45)",
  },
  info: {
    icon: Info,
    color: "#93C5FD",
    btnBg: "rgba(59, 130, 246, 0.18)",
    btnBorder: "rgba(59, 130, 246, 0.45)",
  },
  success: {
    icon: CheckCircle2,
    color: AURORA.green,
    btnBg: "rgba(34, 197, 94, 0.18)",
    btnBorder: "rgba(34, 197, 94, 0.45)",
  },
};

export function AuroraMessageOverlay({
  visible,
  title,
  body,
  tone = "error",
  okLabel = "OK",
  retryAfterSeconds = null,
  onDismiss,
}: AuroraMessageModalProps) {
  const [remaining, setRemaining] = useState(
    retryAfterSeconds != null ? Math.ceil(retryAfterSeconds) : 0,
  );

  useEffect(() => {
    if (!visible || retryAfterSeconds == null || retryAfterSeconds <= 0) {
      setRemaining(0);
      return;
    }
    setRemaining(Math.ceil(retryAfterSeconds));
    const id = setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [visible, retryAfterSeconds]);

  if (!visible) return null;

  const toneStyle = TONE_STYLES[tone];
  const Icon = toneStyle.icon;
  const showCountdown = retryAfterSeconds != null && retryAfterSeconds > 0;

  const handleDismiss = () => {
    triggerHaptic("light");
    onDismiss();
  };

  return (
    <View
      style={[StyleSheet.absoluteFillObject, styles.overlayRoot]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handleDismiss}
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={styles.card}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <View style={[styles.iconWrap, { borderColor: toneStyle.btnBorder }]}>
            <Icon size={36} color={toneStyle.color} strokeWidth={2.25} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {showCountdown && (
            <Text style={styles.countdown}>
              {remaining > 0
                ? `Try again in ${formatRetryCountdown(remaining)}`
                : "You can try again now."}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.85}
            style={[
              styles.btn,
              {
                backgroundColor: toneStyle.btnBg,
                borderColor: toneStyle.btnBorder,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={okLabel}
          >
            <Text style={styles.btnText}>{okLabel}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </View>
  );
}

export function AuroraMessageModal(props: AuroraMessageModalProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={props.visible}
      onRequestClose={props.onDismiss}
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      statusBarTranslucent
    >
      <AuroraMessageOverlay {...props} />
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
    alignItems: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    backgroundColor: AURORA.cardDark,
  },
  title: {
    color: AURORA.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  body: {
    color: AURORA.textSec,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  countdown: {
    color: AURORA.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  btn: {
    width: "100%",
    minHeight: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  btnText: {
    color: AURORA.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
});
