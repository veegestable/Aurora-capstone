import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react-native";
import { AppText as Text } from "./AppText";
import { AURORA } from "../../constants/aurora-colors";

export type FeedbackTone = "info" | "success" | "error" | "warning";

export type InfoGuideContent = {
  title: string;
  body: string;
  tone?: FeedbackTone;
  actionLabel?: string;
};

type InfoGuideModalProps = {
  guide: InfoGuideContent | null;
  onClose: () => void;
};

const TONE_META: Record<
  FeedbackTone,
  { Icon: LucideIcon; color: string; bg: string; border: string }
> = {
  info: {
    Icon: Info,
    color: "#93C5FD",
    bg: "rgba(45,107,255,0.14)",
    border: "rgba(45,107,255,0.4)",
  },
  success: {
    Icon: CheckCircle2,
    color: "#6EE7B7",
    bg: "rgba(34,197,94,0.14)",
    border: "rgba(34,197,94,0.4)",
  },
  error: {
    Icon: AlertCircle,
    color: "#FCA5A5",
    bg: "rgba(239,68,68,0.14)",
    border: "rgba(239,68,68,0.38)",
  },
  warning: {
    Icon: TriangleAlert,
    color: "#FCD34D",
    bg: "rgba(245,158,11,0.14)",
    border: "rgba(245,158,11,0.4)",
  },
};

/**
 * Same visuals as InfoGuideModal, without a nested RN Modal.
 * Use this when a guide must appear on top of content that is already
 * inside another Modal (stacked Modals are unreliable on Android/iOS).
 */
export function InfoGuideOverlay({ guide, onClose }: InfoGuideModalProps) {
  if (!guide) return null;

  const tone = guide.tone ?? "info";
  const meta = TONE_META[tone];
  const Icon = meta.Icon;

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
          accessibilityViewIsModal
        >
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: meta.bg, borderColor: meta.border },
              ]}
            >
              <Icon size={20} color={meta.color} />
            </View>
            <Text style={styles.title}>{guide.title}</Text>
          </View>
          <Text style={styles.body}>{guide.body}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.actionBtn,
              { backgroundColor: meta.bg, borderColor: meta.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel={guide.actionLabel ?? "Got it"}
          >
            <Text style={styles.actionText}>
              {guide.actionLabel ?? "Got it"}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </View>
  );
}

export function InfoGuideModal({ guide, onClose }: InfoGuideModalProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!guide}
      onRequestClose={onClose}
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      statusBarTranslucent
    >
      <InfoGuideOverlay guide={guide} onClose={onClose} />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    color: AURORA.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  body: {
    color: AURORA.textSec,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  actionBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionText: {
    color: AURORA.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
});
