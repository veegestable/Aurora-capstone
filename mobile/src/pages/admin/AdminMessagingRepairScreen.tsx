import { AppText as Text } from "../../components/common/AppText";
import { AppTextInput as TextInput } from "../../components/common/AppTextInput";
/**
 * Admin tool — repair conversation `college_code` tags after college transfers.
 */
import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, MessageSquare, Search } from "lucide-react-native";
import {
  firestoreService,
  type ConversationCollegeRepairResult,
} from "../../services/firebase-firestore.service";
import { AURORA } from "../../constants/aurora-colors";
import {
  getCollegeName,
  resolveCollegeCodeFromUserData,
} from "../../constants/colleges";
import { ADMIN_TAB_BAR_BOTTOM_CLEARANCE } from "../../../constants/admin-tab-bar";
import { AuroraConfirmModal } from "../../components/common/AuroraConfirmModal";
import {
  InfoGuideModal,
  type InfoGuideContent,
} from "../../components/common/InfoGuideModal";
import { buildFeedback } from "../../utils/aurora-feedback";

type FoundUser = Record<string, unknown> & { id: string };

function formatRepairSummary(r: ConversationCollegeRepairResult): string {
  return [
    `College: ${r.collegeCode} (${getCollegeName(r.collegeCode)})`,
    `Threads scanned: ${r.scanned}`,
    `Tags repaired: ${r.repaired}`,
    `Already correct: ${r.alreadyCorrect}`,
    `Skipped (participants not both in this college): ${r.skippedNotAligned}`,
    r.failed > 0 ? `Failed: ${r.failed}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function AdminMessagingRepairScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<FoundUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [feedback, setFeedback] = useState<InfoGuideContent | null>(null);

  const search = async () => {
    const q = email.trim();
    if (!q) {
      setFeedback(
        buildFeedback("Enter an email", "Type the user's account email.", "warning"),
      );
      return;
    }
    setSearching(true);
    setFound(null);
    try {
      const user = await firestoreService.findUserByEmailForAdmin(q);
      if (!user) {
        setFeedback(
          buildFeedback(
            "No account found",
            "Check the email and try again.",
            "warning",
          ),
        );
        return;
      }
      const role = String(user.role ?? "");
      if (role !== "student" && role !== "counselor") {
        setFeedback(
          buildFeedback(
            "Wrong account type",
            "Repair applies to students and counselors only.",
            "warning",
          ),
        );
        return;
      }
      setFound(user);
    } catch (e) {
      setFeedback(
        buildFeedback(
          "Search failed",
          e instanceof Error ? e.message : "Could not look up user.",
          "error",
        ),
      );
    } finally {
      setSearching(false);
    }
  };

  const runRepair = async () => {
    if (!found) return;
    setRepairing(true);
    try {
      const result = await firestoreService.adminRepairConversationCollegeTags(
        found.id,
      );
      setShowConfirm(false);
      setFeedback(
        buildFeedback(
          result.repaired > 0 ? "Repair complete" : "No changes needed",
          formatRepairSummary(result),
          result.repaired > 0 ? "success" : "info",
        ),
      );
    } catch (e) {
      setFeedback(
        buildFeedback(
          "Repair failed",
          e instanceof Error ? e.message : "Could not repair tags.",
          "error",
        ),
      );
    } finally {
      setRepairing(false);
    }
  };

  const foundCollege = found
    ? resolveCollegeCodeFromUserData(found)
    : "";

  return (
    <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: AURORA.border,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 4, marginRight: 12 }}
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
            Repair message tags
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 32 + ADMIN_TAB_BAR_BOTTOM_CLEARANCE,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              color: AURORA.textSec,
              fontSize: 14,
              lineHeight: 21,
              marginBottom: 20,
            }}
          >
            Use this when a student or counselor returned to a college but old
            threads still appear under Past college (read-only). This updates
            conversation tags where both people are currently in the same
            college. Message history is not deleted.
          </Text>

          <Text
            style={{
              color: AURORA.textMuted,
              fontSize: 12,
              fontWeight: "600",
              marginBottom: 8,
            }}
          >
            Account email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="student@example.edu"
            placeholderTextColor={AURORA.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={{
              backgroundColor: AURORA.card,
              borderWidth: 1,
              borderColor: AURORA.border,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: "#FFFFFF",
              fontSize: 15,
              marginBottom: 12,
            }}
          />
          <TouchableOpacity
            onPress={() => void search()}
            disabled={searching}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: "rgba(59,130,246,0.25)",
              borderWidth: 1,
              borderColor: "rgba(59,130,246,0.5)",
              opacity: searching ? 0.6 : 1,
              marginBottom: 24,
            }}
          >
            {searching ? (
              <ActivityIndicator color={AURORA.blue} size="small" />
            ) : (
              <Search size={18} color="#93C5FD" />
            )}
            <Text style={{ color: "#93C5FD", fontWeight: "700" }}>
              Find user
            </Text>
          </TouchableOpacity>

          {found ? (
            <View
              style={{
                backgroundColor: AURORA.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: AURORA.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <MessageSquare size={22} color={AURORA.blue} />
                <Text
                  style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}
                >
                  {String(found.full_name ?? "User")}
                </Text>
              </View>
              <Text style={{ color: AURORA.textSec, fontSize: 13, marginBottom: 4 }}>
                {String(found.email ?? "")}
              </Text>
              <Text style={{ color: AURORA.textSec, fontSize: 13, marginBottom: 4 }}>
                Role: {String(found.role ?? "—")}
              </Text>
              <Text style={{ color: AURORA.textSec, fontSize: 13, marginBottom: 16 }}>
                Current college:{" "}
                {foundCollege
                  ? `${foundCollege} — ${getCollegeName(foundCollege)}`
                  : "(not set — cannot repair)"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowConfirm(true)}
                disabled={!foundCollege || repairing}
                style={{
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: foundCollege
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(100,116,139,0.2)",
                  borderWidth: 1,
                  borderColor: foundCollege
                    ? "rgba(34,197,94,0.45)"
                    : AURORA.border,
                  opacity: repairing ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    color: foundCollege ? "#86EFAC" : AURORA.textMuted,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Repair conversation college tags
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <AuroraConfirmModal
        visible={showConfirm}
        title="Repair message tags?"
        body={
          found
            ? `Re-tag conversations for ${String(found.full_name ?? "this user")} using college ${foundCollege} (${getCollegeName(foundCollege)}). Only threads where both counselor and student are in that college will be updated.`
            : ""
        }
        cancelLabel="Cancel"
        confirmLabel="Repair"
        busy={repairing}
        onCancel={() => {
          if (!repairing) setShowConfirm(false);
        }}
        onConfirm={() => void runRepair()}
      />

      <InfoGuideModal guide={feedback} onClose={() => setFeedback(null)} />
    </View>
  );
}
