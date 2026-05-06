import { AppText as Text } from "../../src/components/common/AppText";
/**
 * Admin Activity / Audit timeline - Route: /(admin)/audit-logs
 * Shows sign-ins, app usage (foreground), and admin actions.
 */
import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { AURORA } from "../../src/constants/aurora-colors";
import { auditLogsService } from "../../src/services/audit-logs.service";
import type { AuditEntry } from "../../src/types/audit.types";
import AuditLogItem from "../../src/components/admin/AuditLogItem";

export default function AdminAuditLogsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const result = await auditLogsService.list(200);
      setLogs(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: AURORA.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          {router.canGoBack() ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 4, marginRight: 12 }}
            >
              <ArrowLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 34 }} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Activity timeline</Text>
            <Text style={styles.subHead}>
              Counselor/student sign-in & sign-out, app usage, and admin actions
              (newest first).
            </Text>
          </View>
        </View>

        {loading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color={AURORA.blue} />
          </View>
        ) : error ? (
          <View style={{ padding: 20 }}>
            <Text style={{ color: AURORA.red }}>{error}</Text>
          </View>
        ) : logs.length === 0 ? (
          <View
            style={{
              flex: 1,
              padding: 20,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: AURORA.textSec, textAlign: "center" }}>
              No activity recorded yet. Sign in or open the app as a student or
              counselor to see entries here.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load(true)}
                tintColor={AURORA.blue}
              />
            }
          >
            {logs.map((l, i) => (
              <AuditLogItem
                key={l.id}
                entry={l}
                isLast={i === logs.length - 1}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AURORA.border,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  subHead: {
    color: AURORA.textSec,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});
