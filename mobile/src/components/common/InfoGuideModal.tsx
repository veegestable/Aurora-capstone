import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { AppText as Text } from "./AppText";
import { AURORA } from "../../constants/aurora-colors";

export type InfoGuideContent = {
  title: string;
  body: string;
};

type InfoGuideModalProps = {
  guide: InfoGuideContent | null;
  onClose: () => void;
};

/**
 * Same visuals as InfoGuideModal, without a nested RN Modal.
 * Use this when a guide must appear on top of content that is already
 * inside another Modal (stacked Modals are unreliable on Android/iOS).
 */
export function InfoGuideOverlay({ guide, onClose }: InfoGuideModalProps) {
  if (!guide) return null;
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: 100, elevation: 24 },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(3,8,24,0.55)",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: AURORA.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: AURORA.border,
            padding: 16,
          }}
        >
          <Text
            style={{
              color: AURORA.textPrimary,
              fontSize: 16,
              fontWeight: "800",
              marginBottom: 10,
            }}
          >
            {guide.title}
          </Text>
          <Text
            style={{
              color: AURORA.textSec,
              fontSize: 13,
              lineHeight: 19,
            }}
          >
            {guide.body}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              alignSelf: "flex-end",
              marginTop: 14,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: "rgba(124,58,237,0.18)",
              borderWidth: 1,
              borderColor: "rgba(124,58,237,0.45)",
            }}
          >
            <Text
              style={{
                color: AURORA.textPrimary,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Got it
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
    >
      <InfoGuideOverlay guide={guide} onClose={onClose} />
    </Modal>
  );
}
