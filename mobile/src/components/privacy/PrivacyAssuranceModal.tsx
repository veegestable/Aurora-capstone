import React from "react";
import {
  Linking,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, ExternalLink, Lock, Shield, X } from "lucide-react-native";
import { AppText as Text } from "../common/AppText";
import { AURORA } from "../../constants/aurora-colors";
import {
  MSUIIT_PRIVACY_POLICY_URL,
  STUDENT_PRIVACY_MODAL_INTRO,
  STUDENT_PRIVACY_MODAL_TITLE,
  STUDENT_PRIVACY_MESSAGES_DETAIL,
  STUDENT_PRIVACY_NARROW_DETAIL,
  STUDENT_PRIVACY_NARROW_TITLE,
  STUDENT_PRIVACY_VISIBLE_DETAIL,
  STUDENT_PRIVACY_VISIBLE_TITLE,
} from "../../constants/student-privacy";

type PrivacyAssuranceModalProps = {
  visible: boolean;
  onClose: () => void;
};

function SectionBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: AURORA.border,
        paddingVertical: 14,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {icon}
        <Text
          style={{ flex: 1, color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
        >
          {title}
        </Text>
      </View>
      <Text style={{ color: AURORA.textSec, fontSize: 13, lineHeight: 20 }}>
        {body}
      </Text>
    </View>
  );
}

export function PrivacyAssuranceModal({
  visible,
  onClose,
}: PrivacyAssuranceModalProps) {
  const openPolicy = async () => {
    try {
      const canOpen = await Linking.canOpenURL(MSUIIT_PRIVACY_POLICY_URL);
      if (canOpen) {
        await Linking.openURL(MSUIIT_PRIVACY_POLICY_URL);
      }
    } catch {
      /* best effort */
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: AURORA.bgDeep }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: AURORA.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Shield size={20} color={AURORA.blue} />
            <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "800" }}>
              {STUDENT_PRIVACY_MODAL_TITLE}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close privacy information"
          >
            <X size={22} color={AURORA.textSec} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              color: AURORA.textSec,
              fontSize: 13,
              lineHeight: 20,
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            {STUDENT_PRIVACY_MODAL_INTRO}
          </Text>

          <View
            style={{
              backgroundColor: AURORA.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: AURORA.border,
              paddingHorizontal: 16,
              marginTop: 8,
            }}
          >
            <SectionBlock
              icon={<Eye size={18} color={AURORA.green} />}
              title={STUDENT_PRIVACY_VISIBLE_TITLE}
              body={STUDENT_PRIVACY_VISIBLE_DETAIL}
            />
            <SectionBlock
              icon={<Lock size={18} color={AURORA.blue} />}
              title={STUDENT_PRIVACY_NARROW_TITLE}
              body={STUDENT_PRIVACY_NARROW_DETAIL}
            />
            <SectionBlock
              icon={<Shield size={18} color={AURORA.blue} />}
              title="Messages & sessions"
              body={STUDENT_PRIVACY_MESSAGES_DETAIL}
            />
          </View>

          <TouchableOpacity
            onPress={() => void openPolicy()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 20,
              alignSelf: "flex-start",
            }}
          >
            <Text
              style={{
                color: AURORA.blue,
                fontSize: 13,
                fontWeight: "700",
                letterSpacing: 0.4,
              }}
            >
              READ MSU-IIT PRIVACY POLICY
            </Text>
            <ExternalLink size={14} color={AURORA.blue} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: AURORA.blue,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              marginTop: 24,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
              Got it
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
