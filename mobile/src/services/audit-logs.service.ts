import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  AuditEntry,
  EngagementSnapshot7d,
  RoleEngagementCounts,
} from "../types/audit.types";

const MS_PER_DAY = 86_400_000;

function emptyRoleCounts(): RoleEngagementCounts {
  return { counselor: 0, student: 0, admin: 0, other: 0 };
}

function bucketRole(role?: string): keyof RoleEngagementCounts {
  const r = (role ?? "").toLowerCase();
  if (r === "counselor") return "counselor";
  if (r === "student") return "student";
  if (r === "admin") return "admin";
  return "other";
}

export const auditLogsService = {
  async write(entry: Omit<AuditEntry, "id" | "createdAt">): Promise<void> {
    await addDoc(collection(db, "audit_logs"), {
      ...entry,
      createdAt: Timestamp.now(),
    });
  },

  async list(maxCount = 200): Promise<AuditEntry[]> {
    const q = query(
      collection(db, "audit_logs"),
      orderBy("createdAt", "desc"),
      limit(maxCount),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        performedBy: String(data.performedBy ?? ""),
        performedByRole: data.performedByRole
          ? String(data.performedByRole)
          : undefined,
        action: String(data.action ?? ""),
        targetType: String(data.targetType ?? ""),
        targetId: String(data.targetId ?? ""),
        metadata:
          data.metadata != null
            ? (data.metadata as Record<string, unknown>)
            : undefined,
        createdAt: data.createdAt?.toDate?.() ?? undefined,
      } satisfies AuditEntry;
    });
  },

  /**
   * Aggregates audit rows in the last `windowDays` days for engagement metrics.
   * Fetches up to `fetchCap` newest rows then filters by date (avoids extra indexes).
   */
  async getEngagementSnapshotLastDays(
    windowDays = 7,
    fetchCap = 2000,
  ): Promise<EngagementSnapshot7d> {
    const q = query(
      collection(db, "audit_logs"),
      orderBy("createdAt", "desc"),
      limit(fetchCap),
    );
    const snapshot = await getDocs(q);
    const logs: AuditEntry[] = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        performedBy: String(data.performedBy ?? ""),
        performedByRole: data.performedByRole
          ? String(data.performedByRole)
          : undefined,
        action: String(data.action ?? ""),
        targetType: String(data.targetType ?? ""),
        targetId: String(data.targetId ?? ""),
        metadata:
          data.metadata != null
            ? (data.metadata as Record<string, unknown>)
            : undefined,
        createdAt:
          (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? undefined,
      } satisfies AuditEntry;
    });

    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - windowDays * MS_PER_DAY);
    const startMs = windowStart.getTime();

    const byAction: EngagementSnapshot7d["byAction"] = {
      user_login: emptyRoleCounts(),
      user_logout: emptyRoleCounts(),
      app_active: emptyRoleCounts(),
      message_sent: emptyRoleCounts(),
    };

    let eventsInWindow = 0;
    for (const e of logs) {
      const t = e.createdAt?.getTime();
      if (t == null || t < startMs) continue;
      eventsInWindow += 1;
      const act = e.action;
      if (
        act !== "user_login" &&
        act !== "user_logout" &&
        act !== "app_active" &&
        act !== "message_sent"
      ) {
        continue;
      }
      const slice = byAction[act];
      const b = bucketRole(e.performedByRole);
      slice[b] += 1;
    }

    return {
      windowDays,
      windowStart,
      windowEnd,
      eventsInWindow,
      fetchedRowCount: logs.length,
      byAction,
    };
  },
};
