import { AppText as Text } from "../../components/common/AppText";
/**
 * Admin queue for student/counselor college change requests.
 */
import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, X } from "lucide-react-native";
import { firestoreService } from "../../services/firebase-firestore.service";
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

type Row = Record<string, unknown> & { id: string };

type PendingConfirm = {
  title: string;
  body: string;
  confirmLabel: string;
  rowId: string;
  run: () => Promise<void>;
};

export default function AdminCollegeShiftsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null,
  );
  const [feedback, setFeedback] = useState<InfoGuideContent | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await firestoreService.getUsersWithPendingCollegeShifts();
      setRows(list as Row[]);
    } catch (e) {
      console.error("College shifts load:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const approve = (r: Row) => {
    setPendingConfirm({
      title: "Approve college change",
      body: `Approve shift to ${getCollegeName(String((r.college_shift_request as { requested_college_code?: string })?.requested_college_code ?? ""))} for ${String(r.full_name ?? "user")}?`,
      confirmLabel: "Approve",
      rowId: r.id,
      run: async () => {
        await firestoreService.adminApproveCollegeShift(r.id);
        await load();
      },
    });
  };

  const reject = (r: Row) => {
    setPendingConfirm({
      title: "Reject request",
      body: `Reject the college change request for ${String(r.full_name ?? "user")}?`,
      confirmLabel: "Reject",
      rowId: r.id,
      run: async () => {
        await firestoreService.adminRejectCollegeShift(r.id);
        await load();
      },
    });
  };

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
            College change requests
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator color={AURORA.blue} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              padding: 20,
              paddingBottom: 32 + ADMIN_TAB_BAR_BOTTOM_CLEARANCE,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={AURORA.blue}
              />
            }
          >
            {rows.length === 0 ? (
              <Text style={{ color: AURORA.textMuted, fontSize: 14 }}>
                No pending college change requests.
              </Text>
            ) : (
              rows.map((r) => {
                const req = r.college_shift_request as
                  | {
                      requested_college_code?: string;
                      requested_program?: string;
                      reason?: string;
                    }
                  | undefined;
                const from = resolveCollegeCodeFromUserData(r);
                const to = req?.requested_college_code ?? "";
                const role = String(r.role ?? "");
                return (
                  <View
                    key={r.id}
                    style={{
                      backgroundColor: AURORA.card,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: AURORA.border,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 16,
                        fontWeight: "700",
                        marginBottom: 4,
                      }}
                    >
                      {String(r.full_name ?? "User")}
                    </Text>
                    <Text style={{ color: AURORA.textSec, fontSize: 12, marginBottom: 8 }}>
                      {role} · {String(r.email ?? "")}
                    </Text>
                    <Text style={{ color: AURORA.textSec, fontSize: 13, marginBottom: 4 }}>
                      From: {from ? `${from} — ${getCollegeName(from)}` : "(unset)"}
                    </Text>
                    <Text style={{ color: "#B9CCFF", fontSize: 13, marginBottom: 4 }}>
                      To: {to ? `${to} — ${getCollegeName(to)}` : "—"}
                    </Text>
                    {role === "student" ? (
                      <Text
                        style={{
                          color: AURORA.textSec,
                          fontSize: 12,
                          lineHeight: 18,
                          marginBottom: 8,
                        }}
                      >
                        Requested program:{" "}
                        {String(req?.requested_program ?? "—")}
                      </Text>
                    ) : null}
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 13,
                        lineHeight: 19,
                        marginBottom: 12,
                      }}
                    >
                      Reason: {String(req?.reason ?? "—")}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => approve(r)}
                        disabled={busyId === r.id}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          paddingVertical: 12,
                          borderRadius: 12,
                          backgroundColor: "rgba(34,197,94,0.2)",
                          borderWidth: 1,
                          borderColor: "rgba(34,197,94,0.45)",
                          opacity: busyId === r.id ? 0.5 : 1,
                        }}
                      >
                        <Check size={18} color="#86EFAC" />
                        <Text style={{ color: "#86EFAC", fontWeight: "700" }}>
                          Approve
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => reject(r)}
                        disabled={busyId === r.id}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          paddingVertical: 12,
                          borderRadius: 12,
                          backgroundColor: "rgba(239,68,68,0.15)",
                          borderWidth: 1,
                          borderColor: "rgba(239,68,68,0.4)",
                          opacity: busyId === r.id ? 0.5 : 1,
                        }}
                      >
                        <X size={18} color="#FCA5A5" />
                        <Text style={{ color: "#FCA5A5", fontWeight: "700" }}>
                          Reject
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <AuroraConfirmModal
        visible={!!pendingConfirm}
        title={pendingConfirm?.title ?? ""}
        body={pendingConfirm?.body ?? ""}
        cancelLabel="Cancel"
        confirmLabel={pendingConfirm?.confirmLabel ?? "Continue"}
        busy={!!busyId}
        onCancel={() => {
          if (!busyId) setPendingConfirm(null);
        }}
        onConfirm={() => {
          if (!pendingConfirm) return;
          void (async () => {
            setBusyId(pendingConfirm.rowId);
            try {
              await pendingConfirm.run();
              setPendingConfirm(null);
            } catch (e) {
              setFeedback(
                buildFeedback(
                  "Error",
                  e instanceof Error ? e.message : "Could not complete action.",
                  "error",
                ),
              );
            } finally {
              setBusyId(null);
            }
          })();
        }}
      />

      <InfoGuideModal
        guide={feedback}
        onClose={() => setFeedback(null)}
      />
    </View>
  );
}
