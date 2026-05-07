/**
 * Admin Announcements Screen - announcements.tsx
 * ===============================================
 * Route: /(admin)/announcements
 * Role: ADMIN
 *
 * Shows all announcements with author + date metadata.
 */
import React, { useCallback, useState } from "react";
import { View, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Megaphone, ArrowLeft } from "lucide-react-native";
import { AppText as Text } from "../../src/components/common/AppText";
import { AURORA } from "../../src/constants/aurora-colors";
import { announcementsService, type Announcement } from "../../src/services/announcements.service";

function formatAdminDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminAnnouncementsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    try {
      const list = await announcementsService.listAll(200);
      setItems(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAnnouncements();
    }, [loadAnnouncements]),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={20} color={AURORA.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Megaphone size={18} color={AURORA.amber} />
              <Text style={styles.title}>Announcements</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>All posts with publisher and date</Text>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color={AURORA.blue} />
            <Text style={styles.stateLabel}>Loading announcements...</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void loadAnnouncements();
                }}
                tintColor={AURORA.blue}
              />
            }
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Text style={styles.stateLabel}>No announcements yet.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : null}
                <Text style={styles.cardTitle}>{item.title || "Untitled announcement"}</Text>
                <Text style={styles.cardMeta}>
                  Posted by: {item.createdByName || "Unknown"} · {formatAdminDate(item.createdAt)}
                </Text>
                <Text style={styles.cardContent} numberOfLines={3}>
                  {item.content || "No content."}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AURORA.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: AURORA.textSec,
    fontSize: 13,
    marginTop: 6,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
  },
  stateLabel: {
    color: AURORA.textMuted,
    fontSize: 14,
  },
  card: {
    backgroundColor: AURORA.card,
    borderWidth: 1,
    borderColor: AURORA.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardImage: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: AURORA.border,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  cardMeta: {
    color: AURORA.textSec,
    fontSize: 12,
    marginBottom: 8,
  },
  cardContent: {
    color: "#D8E0F2",
    fontSize: 13,
    lineHeight: 19,
  },
});
