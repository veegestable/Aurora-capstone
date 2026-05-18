// Firebase Firestore Service for Aurora Mood Tracking
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  setDoc,
  Timestamp,
  doc,
  updateDoc,
  writeBatch,
  deleteDoc,
  deleteField,
  onSnapshot,
  type QuerySnapshot,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  createSessionNotificationTrusted,
  sendTextMessageTrusted as sendTextMessageTrustedCallable,
  sendSessionRequestTrusted as sendSessionRequestTrustedCallable,
} from "./trusted-backend.service";
import {
  type SessionHistoryBadge,
  EXPIRED_SESSION_RETENTION_MS,
  computeSessionHistoryBadge,
  getConfirmedFinalSlot,
  getOverdueSchedulingState,
  getSessionScheduledDate,
} from "../utils/sessionScheduling";
import { normalizeScheduleWhitespace } from "../utils/dateHelpers";
import {
  resolveSessionsDocIdFromInviteMessageData,
  isPlaceholderSessionDocId,
  resolveSessionsDocIdForSessionCard,
} from "../utils/sessionInviteIds";
import {
  resolveCollegeCodeFromUserData,
  isCollegeCode,
  type CollegeCode,
} from "../constants/colleges";
import { isProgramInCollege } from "../constants/college-programs-iit";
import {
  conversationCollegeTagFromData,
  isActiveCollegeInboxThread,
  isPastCollegeThread,
  MESSAGING_CLOSED_ERROR,
  resolveCollegeFromUserRecord,
} from "../utils/conversationCollegeMessaging";

const AUTO_ACCEPTED_PREFIX = "__AUTO_ACCEPTED__";

export type ConversationInboxScope = "active" | "past";

async function fetchUserCollegeMap(
  userIds: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter((id) => id.trim()))];
  const map: Record<string, string> = {};
  await Promise.all(
    unique.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, "users", id));
        map[id] = resolveCollegeFromUserRecord(
          (snap.data() ?? {}) as Record<string, unknown>,
        );
      } catch {
        map[id] = "";
      }
    }),
  );
  return map;
}

function conversationInboxClassifyInput(
  data: Record<string, unknown>,
  viewerCollege: string,
  collegeByUserId: Record<string, string>,
): {
  conversationCollegeCode: string;
  viewerCollegeCode: string;
  counselorCollegeCode: string;
  studentCollegeCode: string;
} {
  const counselorId = String(data.counselorId ?? "");
  const studentId = String(data.studentId ?? "");
  return {
    conversationCollegeCode: conversationCollegeTagFromData(data),
    viewerCollegeCode: viewerCollege,
    counselorCollegeCode: collegeByUserId[counselorId] ?? "",
    studentCollegeCode: collegeByUserId[studentId] ?? "",
  };
}

function sameResolvedCollege(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  const ca = resolveCollegeCodeFromUserData(a ?? null);
  const cb = resolveCollegeCodeFromUserData(b ?? null);
  return !!ca && !!cb && ca === cb;
}

function sanitizeConversationPreview(raw: unknown): string {
  const text = typeof raw === "string" ? raw : "";
  const stripped = text.startsWith(AUTO_ACCEPTED_PREFIX)
    ? text.slice(AUTO_ACCEPTED_PREFIX.length).trim()
    : text;
  return stripped || "No messages yet";
}

function conversationCollegeTag(data: Record<string, unknown>): string {
  const raw = data.college_code;
  return typeof raw === "string" ? raw.trim() : "";
}

/** Inbox shows only threads for the user's current college; other colleges stay stored for later. */
function conversationMatchesActiveCollege(
  data: Record<string, unknown>,
  activeCollege: string | undefined | null,
): boolean {
  const active = (activeCollege ?? "").trim();
  if (!active || !isCollegeCode(active)) return true;
  const tag = conversationCollegeTag(data);
  if (!tag) return false;
  return tag === active;
}

async function resolveConversationCollegeCode(
  counselorId: string,
  studentId: string,
): Promise<CollegeCode | ""> {
  try {
    const [cSnap, sSnap] = await Promise.all([
      getDoc(doc(db, "users", counselorId)),
      getDoc(doc(db, "users", studentId)),
    ]);
    const studentCollege = resolveCollegeCodeFromUserData(
      (sSnap.data() ?? {}) as Record<string, unknown>,
    );
    if (studentCollege) return studentCollege;
    const counselorCollege = resolveCollegeCodeFromUserData(
      (cSnap.data() ?? {}) as Record<string, unknown>,
    );
    return counselorCollege ?? "";
  } catch {
    return "";
  }
}

/** Before college shift: stamp legacy threads so they stay tied to the previous college. */
async function stampParticipantConversationsWithCollege(
  uid: string,
  collegeCode: CollegeCode,
): Promise<void> {
  const seen = new Set<string>();
  const toUpdate: { id: string; ref: ReturnType<typeof doc> }[] = [];

  const collect = (snapshot: Awaited<ReturnType<typeof getDocs>>) => {
    snapshot.docs.forEach((d) => {
      if (seen.has(d.id)) return;
      seen.add(d.id);
      const data = d.data() as Record<string, unknown>;
      if (conversationCollegeTag(data)) return;
      toUpdate.push({ id: d.id, ref: doc(db, "conversations", d.id) });
    });
  };

  try {
    const [asCounselor, asStudent] = await Promise.all([
      getDocs(
        query(collection(db, "conversations"), where("counselorId", "==", uid)),
      ),
      getDocs(
        query(collection(db, "conversations"), where("studentId", "==", uid)),
      ),
    ]);
    collect(asCounselor);
    collect(asStudent);
  } catch (e) {
    console.warn("[conversations] college stamp query failed:", e);
    return;
  }

  await Promise.all(
    toUpdate.map(({ ref }) =>
      updateDoc(ref, {
        college_code: collegeCode,
        updated_at: new Date(),
      }).catch(() => {}),
    ),
  );
}

/** Before college shift: stamp legacy sessions so they stay tied to the previous college. */
async function stampParticipantSessionsWithCollege(
  uid: string,
  collegeCode: CollegeCode,
): Promise<void> {
  const seen = new Set<string>();
  const toUpdate: ReturnType<typeof doc>[] = [];

  const collect = (snapshot: Awaited<ReturnType<typeof getDocs>>) => {
    snapshot.docs.forEach((d) => {
      if (seen.has(d.id)) return;
      seen.add(d.id);
      const data = d.data() as Record<string, unknown>;
      if (conversationCollegeTag(data)) return;
      toUpdate.push(doc(db, "sessions", d.id));
    });
  };

  try {
    const [asCounselor, asStudent] = await Promise.all([
      getDocs(
        query(collection(db, "sessions"), where("counselorId", "==", uid)),
      ),
      getDocs(
        query(collection(db, "sessions"), where("studentId", "==", uid)),
      ),
    ]);
    collect(asCounselor);
    collect(asStudent);
  } catch (e) {
    console.warn("[sessions] college stamp query failed:", e);
    return;
  }

  await Promise.all(
    toUpdate.map((ref) =>
      updateDoc(ref, {
        college_code: collegeCode,
        updatedAt: Timestamp.now(),
      }).catch(() => {}),
    ),
  );
}

async function resolveUserActiveCollegeCode(
  uid: string,
  override?: string | null,
): Promise<string> {
  const trimmed = (override ?? "").trim();
  if (trimmed && isCollegeCode(trimmed)) return trimmed;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return (
      resolveCollegeCodeFromUserData(
        (snap.data() ?? {}) as Record<string, unknown>,
      ) ?? ""
    );
  } catch {
    return "";
  }
}

function normalizeDetectionMethod(raw: unknown): "manual" | "selfie_ai" {
  if (raw === "selfie_ai" || raw === "ai") return "selfie_ai";
  return "manual";
}

export interface MoodData {
  user_id: string;
  emotions: Array<{
    emotion: string;
    confidence: number;
    color: string;
  }>;
  notes: string;
  log_date: Date;
  energy_level: number;
  stress_level: number;
  detection_method: "manual" | "ai" | "selfie_ai";
  sleep_quality?: number | "poor" | "fair" | "good";
  classes_count?: number;
  exams_count?: number;
  deadlines_count?: number;
  event_tags?: string[];
  event_categories?: string[];
  /** Present when row comes from `moodLogs/{uid}/entries`. */
  mood?: string;
  intensity?: number;
  color?: string;
  dayKey?: string;
  entryId?: string;
  duration_in_minutes?: number;
  emotional_volume?: number;
  journal_image_url?: string;
  bath_taken?: boolean;
  meal_responses?: Array<{
    meal_id: string;
    meal_label: string;
    meal_time: string;
    taken: boolean;
  }>;
}

export interface ScheduleData {
  user_id: string;
  title: string;
  description?: string;
  event_date: Date;
  event_type: "exam" | "deadline" | "meeting" | "other";
}

export interface NotificationData {
  user_id: string;
  type: "mood_reminder" | "event_reminder" | "counselor_message";
  message: string;
  status: "pending" | "sent" | "read";
  scheduled_for: Date;
}

/** Firestore may store Timestamp or plain strings; normalize for scheduling + UI. */
function normalizeFirestoreSessionSlot(
  raw: unknown,
): { date: string; time: string } | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  let dateRaw: unknown = o.date ?? o.Date;
  let timeRaw: unknown = o.time ?? o.Time;

  const tsToDate = (v: unknown): Date | null => {
    if (
      v != null &&
      typeof v === "object" &&
      typeof (v as { toDate?: () => Date }).toDate === "function"
    ) {
      return (v as { toDate: () => Date }).toDate();
    }
    return null;
  };

  const dFromDateField = tsToDate(dateRaw);
  if (dFromDateField) {
    dateRaw = dFromDateField.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } else if (
    dateRaw != null &&
    typeof dateRaw === "object" &&
    "seconds" in (dateRaw as object) &&
    typeof (dateRaw as { seconds?: unknown }).seconds === "number"
  ) {
    const d = new Date((dateRaw as { seconds: number }).seconds * 1000);
    dateRaw = d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  const tFromTimeField = tsToDate(timeRaw);
  if (tFromTimeField) {
    timeRaw = tFromTimeField.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } else if (
    timeRaw != null &&
    typeof timeRaw === "object" &&
    "seconds" in (timeRaw as object) &&
    typeof (timeRaw as { seconds?: unknown }).seconds === "number"
  ) {
    const d = new Date((timeRaw as { seconds: number }).seconds * 1000);
    timeRaw = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  const dateStr =
    dateRaw != null && String(dateRaw).trim() !== ""
      ? String(dateRaw).trim()
      : "";
  const timeStr =
    timeRaw != null && String(timeRaw).trim() !== ""
      ? String(timeRaw).trim()
      : "";
  if (!dateStr) return null;
  return {
    date: normalizeScheduleWhitespace(dateStr),
    time: normalizeScheduleWhitespace(timeStr),
  };
}

/** Last resort if normalize missed uncommon shapes but `date` / `time` exist as primitives. */
function looseSessionSlotFromRaw(
  raw: unknown,
): { date: string; time: string } | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const dr = o.date ?? o.Date;
  const tr = o.time ?? o.Time;
  if (dr == null) return null;
  const dateStr = String(dr).trim();
  if (!dateStr) return null;
  return {
    date: normalizeScheduleWhitespace(dateStr),
    time: normalizeScheduleWhitespace(tr != null ? String(tr).trim() : ""),
  };
}

async function createSessionNotification(
  userId: string,
  message: string,
  targetRoute:
    | "/(student)/messages"
    | "/(counselor)/messages" = "/(student)/messages",
  eventKey?: string,
): Promise<void> {
  try {
    await createSessionNotificationTrusted({
      userId,
      message,
      targetRoute,
      eventKey,
    });
  } catch (error) {
    console.warn("⚠️ Could not create session notification:", error);
  }
}

export const firestoreService = {
  // Mood Logs
  async createMoodLog(moodData: Omit<MoodData, "user_id">, userId: string) {
    try {
      const docData = {
        ...moodData,
        user_id: userId,
        log_date: Timestamp.fromDate(moodData.log_date),
        created_at: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "mood_logs"), docData);
      console.log("✅ Mood log created with ID:", docRef.id);
      return { id: docRef.id, ...docData };
    } catch(error: unknown) {
      console.error("❌ Error creating mood log:", error);
      throw error;
    }
  },

  async getMoodLogs(userId: string, startDate?: Date, endDate?: Date) {
    try {
      let q = query(
        collection(db, "mood_logs"),
        where("user_id", "==", userId),
        orderBy("log_date", "desc"),
      );

      // Add date filters if provided
      if (startDate) {
        q = query(q, where("log_date", ">=", Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        q = query(q, where("log_date", "<=", Timestamp.fromDate(endDate)));
      }

      const querySnapshot = await getDocs(q);
      const moodLogs = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          user_id: data.user_id,
          emotions: data.emotions || [],
          notes: data.notes || "",
          log_date: data.log_date?.toDate() || new Date(),
          energy_level: data.energy_level || 5,
          stress_level: data.stress_level || 3,
          sleep_quality: data.sleep_quality,
          classes_count: data.classes_count,
          exams_count: data.exams_count,
          deadlines_count: data.deadlines_count,
          detection_method: normalizeDetectionMethod(data.detection_method),
          created_at: data.created_at?.toDate() || new Date(),
        } as MoodData & { id: string; created_at: Date; log_date: Date };
      });

      console.log("✅ Retrieved", moodLogs.length, "mood logs");
      return moodLogs;
    } catch (error: unknown) {
      console.error("❌ Error getting mood logs:", error);
      throw error;
    }
  },

  /**
   * Live updates for mood logs in a date range (same query shape as getMoodLogs).
   */
  subscribeMoodLogs(
    userId: string,
    startDate: Date | undefined,
    endDate: Date | undefined,
    onNext: (
      logs: (MoodData & { id: string; created_at: Date; log_date: Date })[],
    ) => void,
    onError?: (error: Error) => void,
  ): () => void {
    try {
      let q = query(
        collection(db, "mood_logs"),
        where("user_id", "==", userId),
        orderBy("log_date", "desc"),
      );
      if (startDate) {
        q = query(q, where("log_date", ">=", Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        q = query(q, where("log_date", "<=", Timestamp.fromDate(endDate)));
      }
      return onSnapshot(
        q,
        (querySnapshot) => {
          const moodLogs = querySnapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              user_id: data.user_id,
              emotions: data.emotions || [],
              notes: data.notes || "",
              log_date: data.log_date?.toDate() || new Date(),
              energy_level: data.energy_level || 5,
              stress_level: data.stress_level || 3,
              sleep_quality: data.sleep_quality,
              classes_count: data.classes_count,
              exams_count: data.exams_count,
              deadlines_count: data.deadlines_count,
              detection_method: normalizeDetectionMethod(data.detection_method),
              created_at: data.created_at?.toDate() || new Date(),
            } as MoodData & { id: string; created_at: Date; log_date: Date };
          });
          onNext(moodLogs);
        },
        (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
      );
    } catch(error: unknown) {
      console.error("❌ subscribeMoodLogs setup error:", error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      return () => {};
    }
  },

  async updateMoodLog(logId: string, updateData: Partial<MoodData>) {
    try {
      const logRef = doc(db, "mood_logs", logId);

      const updatePayload: Record<string, unknown> = {
        ...updateData,
        updated_at: Timestamp.now(),
      };

      if (updateData.log_date) {
        updatePayload.log_date = Timestamp.fromDate(updateData.log_date);
      }

      await updateDoc(logRef, updatePayload);
      console.log("✅ Mood log updated");
      return { id: logId, ...updatePayload };
    } catch(error: unknown) {
      console.error("❌ Error updating mood log:", error);
      throw error;
    }
  },

  // Schedules
  async createSchedule(
    scheduleData: Omit<ScheduleData, "user_id">,
    userId: string,
  ) {
    try {
      const docData = {
        ...scheduleData,
        user_id: userId,
        event_date: Timestamp.fromDate(scheduleData.event_date),
        created_at: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "schedules"), docData);
      console.log("✅ Schedule created with ID:", docRef.id);
      return { id: docRef.id, ...docData };
    } catch(error: unknown) {
      console.error("❌ Error creating schedule:", error);
      throw error;
    }
  },

  async getSchedules(userId: string, startDate?: Date, endDate?: Date) {
    try {
      let q = query(
        collection(db, "schedules"),
        where("user_id", "==", userId),
        orderBy("event_date", "asc"),
      );

      if (startDate) {
        q = query(q, where("event_date", ">=", Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        q = query(q, where("event_date", "<=", Timestamp.fromDate(endDate)));
      }

      const querySnapshot = await getDocs(q);
      const schedules = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        event_date: doc.data().event_date.toDate(),
        created_at: doc.data().created_at?.toDate(),
      }));

      console.log("✅ Retrieved", schedules.length, "schedules");
      return schedules;
    } catch(error: unknown) {
      console.error("❌ Error getting schedules:", error);
      throw error;
    }
  },

  async updateSchedule(scheduleId: string, updateData: Partial<ScheduleData>) {
    try {
      const scheduleRef = doc(db, "schedules", scheduleId);

      const updatePayload: Record<string, unknown> = {
        ...updateData,
        updated_at: Timestamp.now(),
      };

      if (updateData.event_date) {
        updatePayload.event_date = Timestamp.fromDate(updateData.event_date);
      }

      await updateDoc(scheduleRef, updatePayload);
      console.log("✅ Schedule updated");
      return { id: scheduleId, ...updatePayload };
    } catch(error: unknown) {
      console.error("❌ Error updating schedule:", error);
      throw error;
    }
  },

  async deleteSchedule(scheduleId: string) {
    try {
      await deleteDoc(doc(db, "schedules", scheduleId));
      console.log("✅ Schedule deleted");
    } catch(error: unknown) {
      console.error("❌ Error deleting schedule:", error);
      throw error;
    }
  },

  // Notifications
  async createNotification(
    notificationData: Omit<NotificationData, "user_id">,
    userId: string,
  ) {
    try {
      const docData = {
        ...notificationData,
        user_id: userId,
        scheduled_for: Timestamp.fromDate(notificationData.scheduled_for),
        created_at: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "notifications"), docData);
      console.log("✅ Notification created with ID:", docRef.id);
      return { id: docRef.id, ...docData };
    } catch(error: unknown) {
      console.error("❌ Error creating notification:", error);
      throw error;
    }
  },

  async getNotifications(userId: string) {
    try {
      const q = query(
        collection(db, "notifications"),
        where("user_id", "==", userId),
        orderBy("created_at", "desc"),
      );

      const querySnapshot = await getDocs(q);
      const notifications = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          user_id: data.user_id,
          type: data.type,
          message: data.message,
          status: data.status,
          scheduled_for: data.scheduled_for?.toDate() || new Date(),
          created_at: data.created_at?.toDate() || new Date(),
        } as NotificationData & { id: string; created_at: Date };
      });

      console.log("✅ Retrieved", notifications.length, "notifications");
      return notifications;
    } catch(error: unknown) {
      console.error("❌ Error getting notifications:", error);
      throw error;
    }
  },

  // Users (for admin counselor management)
  async getUsersByRole(role: "counselor" | "student" | "admin") {
    try {
      const usersById: Record<string, Record<string, unknown>> = {};
      const collect = (snapshot: Awaited<ReturnType<typeof getDocs>>) => {
        snapshot.docs.forEach((d) => {
          const data = (d.data() ?? {}) as Record<string, unknown>;
          usersById[d.id] = { id: d.id, ...data };
        });
      };

      const primary = query(collection(db, "users"), where("role", "==", role));
      collect(await getDocs(primary));

      if (role === "counselor") {
        const legacy = query(
          collection(db, "users"),
          where("role", "==", "Counselor"),
        );
        collect(await getDocs(legacy));
      }

      return Object.values(usersById);
    } catch(error: unknown) {
      console.error("❌ Error fetching users by role:", error);
      throw error;
    }
  },

  /**
   * Verified students in one college unit. Scoped so counselor collection reads
   * satisfy Firestore rules (counselors may not read students in other colleges).
   */
  async getVerifiedStudentsForCollege(collegeCode: CollegeCode) {
    try {
      const byId: Record<string, Record<string, unknown>> = {};
      const collect = (snapshot: Awaited<ReturnType<typeof getDocs>>) => {
        snapshot.docs.forEach((d) => {
          byId[d.id] = { id: d.id, ...(d.data() ?? {}) };
        });
      };
      const qCode = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("email_verified", "==", true),
        where("college_code", "==", collegeCode),
      );
      collect(await getDocs(qCode));
      const qDept = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("email_verified", "==", true),
        where("department", "==", collegeCode),
      );
      collect(await getDocs(qDept));
      return Object.values(byId);
    } catch(error: unknown) {
      console.error("❌ Error fetching verified students for college:", error);
      throw error;
    }
  },

  /**
   * Counselor-facing student directory source.
   * Includes verified students, plus students already linked to the counselor
   * via existing conversation/session so "special population" students never disappear.
   */
  async getStudentsForCounselor(counselorId: string) {
    const byId: Record<string, Record<string, unknown>> = {};
    const add = (row: Record<string, unknown> | null | undefined) => {
      if (!row) return;
      const id = String(row.id ?? "").trim();
      if (!id) return;
      byId[id] = { ...byId[id], ...row, id };
    };

    let counselorCollege: CollegeCode | "" = "";
    if (counselorId) {
      try {
        const csnap = await getDoc(doc(db, "users", counselorId));
        if (csnap.exists()) {
          counselorCollege = resolveCollegeCodeFromUserData(
            (csnap.data() ?? {}) as Record<string, unknown>,
          );
        }
      } catch {
        // ignore
      }
    }

    const maybeAddVerified = (row: Record<string, unknown>) => {
      if (!counselorCollege) return;
      if (sameResolvedCollege(row, { college_code: counselorCollege })) {
        add(row);
      }
    };

    if (counselorCollege) {
      try {
        const verified = await this.getVerifiedStudentsForCollege(
          counselorCollege,
        );
        (verified as Record<string, unknown>[]).forEach(maybeAddVerified);
      } catch {
        // keep going; linked fallback below
      }
    }

    const linkedIds = new Set<string>();
    try {
      const convos = await this.getConversations(counselorId, {
        activeCollegeCode: counselorCollege || undefined,
      });
      (convos as Record<string, unknown>[]).forEach((c) => {
        const sid = String(c.id ?? c.studentId ?? "").trim();
        if (sid) linkedIds.add(sid);
      });
    } catch {
      // ignore
    }

    try {
      const sessions = await this.getSessionsForCounselor(counselorId, {
        activeCollegeCode: counselorCollege || undefined,
      });
      (sessions as Record<string, unknown>[]).forEach((s) => {
        const sid = String(s.studentId ?? "").trim();
        if (sid) linkedIds.add(sid);
      });
    } catch {
      // ignore
    }

    if (linkedIds.size > 0) {
      await Promise.all(
        [...linkedIds].map(async (sid) => {
          if (byId[sid]) return;
          try {
            const snap = await getDoc(doc(db, "users", sid));
            if (!snap.exists()) return;
            const data = (snap.data() ?? {}) as Record<string, unknown>;
            const role = String(data.role ?? "").toLowerCase();
            if (role !== "student") return;
            const row = { id: sid, ...data };
            if (
              counselorCollege &&
              !sameResolvedCollege(row, { college_code: counselorCollege })
            ) {
              return;
            }
            add(row);
          } catch {
            // ignore one-off fetch failures
          }
        }),
      );
    }

    return Object.values(byId).sort((a, b) =>
      String(a.full_name ?? "")
        .toLowerCase()
        .localeCompare(String(b.full_name ?? "").toLowerCase()),
    );
  },

  /**
   * Approved, verified counselors in one college. Scoped so student collection reads
   * satisfy Firestore rules (students may not read counselors in other colleges).
   */
  async getVerifiedApprovedCounselorsForCollege(collegeCode: CollegeCode) {
    try {
      const byId: Record<string, Record<string, unknown>> = {};
      const collect = (snapshot: Awaited<ReturnType<typeof getDocs>>) => {
        snapshot.docs.forEach((d) => {
          byId[d.id] = { id: d.id, ...(d.data() ?? {}) };
        });
      };

      const approvedCounselors = query(
        collection(db, "users"),
        where("role", "==", "counselor"),
        where("email_verified", "==", true),
        where("approval_status", "==", "approved"),
        where("college_code", "==", collegeCode),
      );
      collect(await getDocs(approvedCounselors));

      const approvedCounselorsLegacyRole = query(
        collection(db, "users"),
        where("role", "==", "Counselor"),
        where("email_verified", "==", true),
        where("approval_status", "==", "approved"),
        where("college_code", "==", collegeCode),
      );
      collect(await getDocs(approvedCounselorsLegacyRole));

      return Object.values(byId);
    } catch(error: unknown) {
      console.error(
        "❌ Error fetching verified approved counselors for college:",
        error,
      );
      throw error;
    }
  },

  /**
   * Counselor picker source for students.
   * Includes:
   * - counselors by role query
   * - counselors already linked through this student's sessions/conversations
   * so linked counselors still appear even if their profile role field is legacy.
   */
  async getCounselorsForStudent(studentId: string) {
    const byId: Record<string, Record<string, unknown>> = {};
    const add = (raw: Record<string, unknown> | null | undefined) => {
      if (!raw) return;
      const id = String(raw.id ?? "").trim();
      if (!id) return;
      byId[id] = { ...byId[id], ...raw, id };
    };

    let studentCollege: CollegeCode | "" = "";
    if (studentId) {
      try {
        const ss = await getDoc(doc(db, "users", studentId));
        if (ss.exists()) {
          studentCollege = resolveCollegeCodeFromUserData(
            (ss.data() ?? {}) as Record<string, unknown>,
          );
        }
      } catch {
        // ignore
      }
    }

    const pickCounselorIdFromSession = (
      row: Record<string, unknown>,
    ): string => String(row.counselorId ?? "").trim();
    const pickCounselorIdFromConversation = (
      row: Record<string, unknown>,
    ): string => String(row.id ?? "").trim();
    const passesCounselorPickerPolicy = (row: Record<string, unknown>) => {
      const approved =
        String(row.approval_status ?? "")
          .trim()
          .toLowerCase() === "approved";
      const verified = row.email_verified === true;
      return approved && verified;
    };

    const maybeAddCounselor = (row: Record<string, unknown>) => {
      if (!passesCounselorPickerPolicy(row)) return;
      if (!studentCollege) return;
      if (!sameResolvedCollege(row, { college_code: studentCollege })) return;
      add(row);
    };

    if (studentCollege) {
      try {
        const roleCounselors =
          await this.getVerifiedApprovedCounselorsForCollege(studentCollege);
        (roleCounselors as Record<string, unknown>[]).forEach(maybeAddCounselor);
      } catch {
        // keep going with linked counselors fallback
      }
    }

    const linkedCounselorIds = new Set<string>();

    try {
      const sessions = await this.getSessionsForStudent(studentId, {
        activeCollegeCode: studentCollege || undefined,
      });
      (sessions as Record<string, unknown>[]).forEach((s) => {
        const cid = pickCounselorIdFromSession(s);
        if (cid) linkedCounselorIds.add(cid);
      });
    } catch {
      // ignore
    }

    try {
      const conversations = await this.getConversationsForStudent(studentId, {
        activeCollegeCode: studentCollege,
      });
      (conversations as Record<string, unknown>[]).forEach((c) => {
        const cid = pickCounselorIdFromConversation(c);
        if (cid) linkedCounselorIds.add(cid);
      });
    } catch {
      // ignore
    }

    if (linkedCounselorIds.size > 0) {
      await Promise.all(
        [...linkedCounselorIds].map(async (cid) => {
          if (byId[cid]) return;
          try {
            const snap = await getDoc(doc(db, "users", cid));
            if (!snap.exists()) return;
            const data = (snap.data() ?? {}) as Record<string, unknown>;
            const candidate = { id: cid, ...data };
            if (!passesCounselorPickerPolicy(candidate)) return;
            if (
              studentCollege &&
              !sameResolvedCollege(candidate, { college_code: studentCollege })
            ) {
              return;
            }
            add(candidate);
          } catch {
            // ignore individual fetch errors
          }
        }),
      );
    }

    return Object.values(byId).sort((a, b) =>
      String(a.full_name ?? a.preferred_name ?? "")
        .toLowerCase()
        .localeCompare(
          String(b.full_name ?? b.preferred_name ?? "").toLowerCase(),
        ),
    );
  },

  async getUsersWithPendingCollegeShifts(): Promise<Record<string, unknown>[]> {
    const q = query(
      collection(db, "users"),
      where("college_shift_pending", "==", true),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() ?? {}),
    })) as Record<string, unknown>[];
  },

  async submitCollegeShiftRequest(
    uid: string,
    requestedCollegeCode: CollegeCode,
    requestedProgram: string,
    reason: string,
  ): Promise<void> {
    if (!isCollegeCode(requestedCollegeCode)) {
      throw new Error("Invalid college selection.");
    }
    const trimmed = reason.trim();
    if (trimmed.length < 8) {
      throw new Error(
        "Please explain your college change (at least 8 characters).",
      );
    }
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) throw new Error("Profile not found.");
    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const isStudent = data.role === "student";
    const programTrim = requestedProgram.trim();
    if (isStudent) {
      if (!programTrim || !isProgramInCollege(requestedCollegeCode, programTrim)) {
        throw new Error(
          "Choose a degree program from the list for your new college.",
        );
      }
    }
    const current = resolveCollegeCodeFromUserData(data);
    if (!current) {
      throw new Error("Set your college on your profile before requesting a change.");
    }
    if (current === requestedCollegeCode) {
      if (data.role !== "student") {
        throw new Error("Select a different college for this request.");
      }
      const curProg =
        typeof data.program === "string" ? data.program.trim() : "";
      if (curProg && programTrim === curProg) {
        throw new Error(
          "Choose a different degree program than your current one.",
        );
      }
    }
    if (data.college_shift_pending === true) {
      throw new Error("You already have a pending college change request.");
    }
    await updateDoc(doc(db, "users", uid), {
      college_shift_request: {
        requested_college_code: requestedCollegeCode,
        requested_program: programTrim,
        reason: trimmed,
        requested_at: Timestamp.now(),
      },
      college_shift_pending: true,
      updated_at: new Date(),
    });
  },

  async adminApproveCollegeShift(uid: string): Promise<void> {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) throw new Error("User not found.");
    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const req = data.college_shift_request as
      | {
          requested_college_code?: unknown;
          requested_program?: unknown;
        }
      | undefined;
    const nextCode = req?.requested_college_code;
    if (!isCollegeCode(nextCode)) {
      throw new Error("No valid pending college request for this user.");
    }
    const nextProgram =
      typeof req?.requested_program === "string"
        ? req.requested_program.trim()
        : "";
    const role = data.role;
    const isStudent = role === "student";
    const previousCollege = resolveCollegeCodeFromUserData(data);
    if (previousCollege) {
      await Promise.all([
        stampParticipantConversationsWithCollege(uid, previousCollege),
        stampParticipantSessionsWithCollege(uid, previousCollege),
      ]);
    }
    if (isStudent) {
      if (!nextProgram || !isProgramInCollege(nextCode, nextProgram)) {
        throw new Error(
          "This pending request is missing a valid program. Reject it and ask the student to submit again.",
        );
      }
      await updateDoc(doc(db, "users", uid), {
        college_code: nextCode,
        program: nextProgram,
        college_shift_request: deleteField(),
        college_shift_pending: false,
        updated_at: new Date(),
      });
      return;
    }
    await updateDoc(doc(db, "users", uid), {
      college_code: nextCode,
      college_shift_request: deleteField(),
      college_shift_pending: false,
      updated_at: new Date(),
    });
  },

  async adminRejectCollegeShift(uid: string): Promise<void> {
    await updateDoc(doc(db, "users", uid), {
      college_shift_request: deleteField(),
      college_shift_pending: false,
      updated_at: new Date(),
    });
  },

  async markNotificationAsRead(notificationId: string) {
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await updateDoc(notificationRef, {
        status: "read",
        updated_at: Timestamp.now(),
      });
      console.log("✅ Notification marked as read");
    } catch(error: unknown) {
      console.error("❌ Error marking notification as read:", error);
      throw error;
    }
  },

  // ─── Messaging (conversation-based, one-to-one counselor-student) ─────────────
  // conversations/{conversationId}: counselorId, studentId, college_code, lastMessage, lastMessageAt, ...
  // conversations/{conversationId}/messages/{messageId}: senderId, content, type, sessionId, sessionData, isRead, readAt, isUrgent, createdAt
  // users/{counselorId}/private/conv_arch__{conversationId}: counselor hides thread from inbox (owner-only; see firestore.rules private match)

  async getCounselorArchivedConversationIds(counselorId: string): Promise<Set<string>> {
    const out = new Set<string>();
    const PREFIX = "conv_arch__";
    try {
      const priv = await getDocs(
        collection(db, "users", counselorId, "private"),
      );
      priv.docs.forEach((d) => {
        if (d.id.startsWith(PREFIX)) {
          out.add(d.id.slice(PREFIX.length));
        }
      });
    } catch {
      /* ignore */
    }
    try {
      const legacy = await getDocs(
        collection(db, "users", counselorId, "archived_conversations"),
      );
      legacy.docs.forEach((d) => out.add(d.id));
    } catch {
      /* ignore — subcollection may be denied if rules not deployed */
    }
    return out;
  },

  /** Hides the thread from this counselor's Messages list only; student still has the conversation. */
  async counselorArchiveConversation(
    counselorId: string,
    conversationId: string,
  ): Promise<void> {
    const uid = auth.currentUser?.uid ?? "";
    if (uid && uid !== counselorId) {
      throw new Error("Only the counselor can archive their inbox view.");
    }
    const docId = `conv_arch__${conversationId}`;
    await setDoc(
      doc(db, "users", counselorId, "private", docId),
      { archivedAt: Timestamp.now() },
      { merge: true },
    );
  },

  /** Restores the thread to the counselor inbox (no-op if not archived). */
  async counselorClearInboxArchive(
    counselorId: string,
    conversationId: string,
  ): Promise<void> {
    const docId = `conv_arch__${conversationId}`;
    await deleteDoc(
      doc(db, "users", counselorId, "private", docId),
    ).catch(() => {});
  },

  async addConversation(
    counselorId: string,
    studentData: {
      id: string;
      name: string;
      avatar: string;
      program?: string;
    },
    counselorData?: { name: string; avatar?: string },
  ) {
    try {
      const uid = auth.currentUser?.uid ?? "";
      if (
        uid &&
        uid !== counselorId &&
        uid !== studentData.id
      ) {
        throw new Error("Signed-in user must be the counselor or the student.");
      }
      const conversationId = `${counselorId}_${studentData.id}`;
      const convRef = doc(db, "conversations", conversationId);
      const collegeCode = await resolveConversationCollegeCode(
        counselorId,
        studentData.id,
      );
      const profileFields: Record<string, unknown> = {
        counselorId,
        studentId: studentData.id,
        student_name: studentData.name,
        student_avatar: studentData.avatar,
        student_program: studentData.program ?? "",
        ...(collegeCode ? { college_code: collegeCode } : {}),
      };
      if (counselorData) {
        profileFields.counselor_name = counselorData.name;
        profileFields.counselor_avatar = counselorData.avatar ?? "";
      }
      // Existing thread: only refresh roster fields. setDoc(..., merge) with lastMessage: ""
      // was wiping real previews after invite / add-student on an existing conversation.
      // Cannot getDoc a missing conversation (rules use resource.data). Try update first.
      try {
        await updateDoc(convRef, profileFields);
      } catch (e: unknown) {
        const code =
          e && typeof e === "object" && "code" in e
            ? String((e as { code: unknown }).code)
            : "";
        // Missing docs often surface as permission-denied (no resource.data), not not-found.
        const isMissingDoc =
          code === "not-found" ||
          code === "permission-denied" ||
          code === "5" ||
          /no document to update/i.test(
            e && typeof e === "object" && "message" in e
              ? String((e as { message: unknown }).message)
              : "",
          );
        if (!isMissingDoc) throw e;
        await setDoc(convRef, {
          ...profileFields,
          lastMessage: "",
          lastMessageAt: Timestamp.now(),
          lastSenderId: null,
          unreadCountCounselor: 0,
          unreadCountStudent: 0,
          createdAt: Timestamp.now(),
        });
      }
      const clearingUid = auth.currentUser?.uid ?? "";
      if (clearingUid === counselorId) {
        await this.counselorClearInboxArchive(counselorId, conversationId);
      }
      return conversationId;
    } catch (error: unknown) {
      console.error("❌ Error adding conversation:", error);
      throw error;
    }
  },

  async _assertMessagingClosedCheck(
    senderId: string,
    conversationData: Record<string, unknown>,
    counselorId: string,
    studentId: string,
  ): Promise<void> {
    if (senderId !== counselorId && senderId !== studentId) {
      throw new Error("Not a conversation participant.");
    }
    const collegeMap = await fetchUserCollegeMap([
      counselorId,
      studentId,
      senderId,
    ]);
    const viewerCollege = collegeMap[senderId] ?? "";
    const classify = conversationInboxClassifyInput(
      conversationData,
      viewerCollege,
      collegeMap,
    );
    if (isPastCollegeThread(classify)) {
      throw new Error(MESSAGING_CLOSED_ERROR);
    }
  },

  async assertConversationMessagingOpen(
    conversationId: string,
    senderId: string,
  ): Promise<void> {
    const convSnap = await getDoc(doc(db, "conversations", conversationId));
    if (!convSnap.exists()) {
      throw new Error("Conversation not found.");
    }
    const data = (convSnap.data() ?? {}) as Record<string, unknown>;
    await this._assertMessagingClosedCheck(
      senderId,
      data,
      String(data.counselorId ?? ""),
      String(data.studentId ?? ""),
    );
  },

  async assertMessagingOpenForParticipants(
    counselorId: string,
    studentId: string,
    senderId: string,
  ): Promise<void> {
    const conversationId = `${counselorId}_${studentId}`;
    const convSnap = await getDoc(doc(db, "conversations", conversationId));
    const data = (
      convSnap.exists()
        ? (convSnap.data() ?? {})
        : { counselorId, studentId }
    ) as Record<string, unknown>;
    await this._assertMessagingClosedCheck(
      senderId,
      data,
      counselorId,
      studentId,
    );
  },

  async assertSessionMessagingOpen(
    sessionId: string,
    senderId: string,
  ): Promise<void> {
    const snap = await getDoc(doc(db, "sessions", sessionId));
    if (!snap.exists()) throw new Error("Session not found.");
    const data = snap.data() as Record<string, unknown>;
    const counselorId = String(data.counselorId ?? "");
    const studentId = String(data.studentId ?? "");
    if (!counselorId || !studentId) {
      throw new Error("Session is missing counselor or student.");
    }
    await this.assertMessagingOpenForParticipants(
      counselorId,
      studentId,
      senderId,
    );
  },

  async getConversations(
    counselorId: string,
    options?: {
      activeCollegeCode?: string | null;
      includeArchived?: boolean;
      inboxScope?: ConversationInboxScope;
    },
  ) {
    const isPlaceholderAvatar = (url: string) =>
      !url || /pravatar|ui-avatars|placeholder\.com|dummyimage/i.test(url);

    let activeCollege = (options?.activeCollegeCode ?? "").trim();
    if (!activeCollege) {
      try {
        const cSnap = await getDoc(doc(db, "users", counselorId));
        activeCollege =
          resolveCollegeCodeFromUserData(
            (cSnap.data() ?? {}) as Record<string, unknown>,
          ) ?? "";
      } catch {
        activeCollege = "";
      }
    }

    const inboxScope = options?.inboxScope ?? "active";

    try {
      const q = query(
        collection(db, "conversations"),
        where("counselorId", "==", counselorId),
        orderBy("lastMessageAt", "desc"),
      );
      const snapshot = await getDocs(q);
      const archivedIds = await this.getCounselorArchivedConversationIds(
        counselorId,
      );
      const includeArchived = options?.includeArchived === true;
      const eligibleDocs = snapshot.docs.filter(
        (d) => includeArchived || !archivedIds.has(d.id),
      );
      const collegeMap = await fetchUserCollegeMap([
        counselorId,
        ...eligibleDocs.map((d) => String(d.data().studentId ?? "")),
      ]);
      const scopedDocs = eligibleDocs.filter((d) => {
        const data = d.data() as Record<string, unknown>;
        const classify = conversationInboxClassifyInput(
          data,
          activeCollege,
          collegeMap,
        );
        const past = isPastCollegeThread(classify);
        if (inboxScope === "past") return past;
        return isActiveCollegeInboxThread(classify);
      });

      const results = await Promise.all(
        scopedDocs.map(async (d) => {
          const data = d.data();
          const isArchived = archivedIds.has(d.id);
          const classify = conversationInboxClassifyInput(
            data as Record<string, unknown>,
            activeCollege,
            collegeMap,
          );
          const messagingClosed = isPastCollegeThread(classify);
          let avatar = data.student_avatar ?? "";
          if ((!avatar || isPlaceholderAvatar(avatar)) && data.studentId) {
            try {
              const userDoc = await getDoc(doc(db, "users", data.studentId));
              const userAvatar = userDoc.data()?.avatar_url ?? "";
              if (userAvatar && !isPlaceholderAvatar(userAvatar)) {
                avatar = userAvatar;
                if (isPlaceholderAvatar(data.student_avatar ?? "")) {
                  updateDoc(doc(db, "conversations", d.id), {
                    student_avatar: userAvatar,
                  }).catch(() => {});
                }
              }
            } catch {
              /* keep existing */
            }
          }
          if (isPlaceholderAvatar(avatar)) avatar = "";
          return {
            id: data.studentId,
            conversationId: d.id,
            name: data.student_name,
            preview: sanitizeConversationPreview(data.lastMessage),
            time: data.lastMessageAt?.toDate
              ? formatMessageTime(data.lastMessageAt.toDate())
              : "Just now",
            avatar,
            isOnline: false,
            isUnread: (data.unreadCountCounselor ?? 0) > 0,
            program: data.student_program ?? undefined,
            studentId: data.studentId,
            messagingClosed,
            isPastCollege: messagingClosed,
            ...(isArchived ? { isArchived: true } : {}),
          };
        }),
      );
      return results;
    } catch(error: unknown) {
      console.error("❌ Error getting conversations:", error);
      throw error;
    }
  },

  async getConversationsForStudent(
    studentId: string,
    options?: {
      activeCollegeCode?: string | null;
      inboxScope?: ConversationInboxScope;
    },
  ) {
    const isPlaceholderAvatar = (url: string) =>
      !url || /pravatar|ui-avatars|placeholder\.com|dummyimage/i.test(url);

    let activeCollege = (options?.activeCollegeCode ?? "").trim();
    if (!activeCollege) {
      try {
        const sSnap = await getDoc(doc(db, "users", studentId));
        activeCollege =
          resolveCollegeCodeFromUserData(
            (sSnap.data() ?? {}) as Record<string, unknown>,
          ) ?? "";
      } catch {
        activeCollege = "";
      }
    }

    const inboxScope = options?.inboxScope ?? "active";

    try {
      const q = query(
        collection(db, "conversations"),
        where("studentId", "==", studentId),
        orderBy("lastMessageAt", "desc"),
      );
      const snapshot = await getDocs(q);
      const collegeMap = await fetchUserCollegeMap([
        studentId,
        ...snapshot.docs.map((d) => String(d.data().counselorId ?? "")),
      ]);
      const scopedDocs = snapshot.docs.filter((d) => {
        const data = d.data() as Record<string, unknown>;
        const classify = conversationInboxClassifyInput(
          data,
          activeCollege,
          collegeMap,
        );
        const past = isPastCollegeThread(classify);
        if (inboxScope === "past") return past;
        return isActiveCollegeInboxThread(classify);
      });

      const results = await Promise.all(
        scopedDocs.map(async (d) => {
          const data = d.data();
          const classify = conversationInboxClassifyInput(
            data as Record<string, unknown>,
            activeCollege,
            collegeMap,
          );
          const messagingClosed = isPastCollegeThread(classify);
          let avatar = data.counselor_avatar ?? "";
          if ((!avatar || isPlaceholderAvatar(avatar)) && data.counselorId) {
            try {
              const userDoc = await getDoc(doc(db, "users", data.counselorId));
              const userAvatar = userDoc.data()?.avatar_url ?? "";
              if (userAvatar && !isPlaceholderAvatar(userAvatar)) {
                avatar = userAvatar;
                if (isPlaceholderAvatar(data.counselor_avatar ?? "")) {
                  updateDoc(doc(db, "conversations", d.id), {
                    counselor_avatar: userAvatar,
                  }).catch(() => {});
                }
              }
            } catch {
              /* keep existing */
            }
          }
          if (isPlaceholderAvatar(avatar)) avatar = "";
          return {
            id: data.counselorId,
            conversationId: d.id,
            name: data.counselor_name ?? "Counselor",
            preview: sanitizeConversationPreview(data.lastMessage),
            time: data.lastMessageAt?.toDate
              ? formatMessageTime(data.lastMessageAt.toDate())
              : "Just now",
            avatar,
            isOnline: false,
            isUnread: (data.unreadCountStudent ?? 0) > 0,
            messagingClosed,
            isPastCollege: messagingClosed,
          };
        }),
      );
      return results;
    } catch(error: unknown) {
      console.error("❌ Error getting student conversations:", error);
      throw error;
    }
  },

  async getMessages(conversationId: string, counselorId: string) {
    return this._getMessages(conversationId, counselorId, "counselor");
  },

  async getMessagesForStudent(conversationId: string, studentId: string) {
    return this._getMessages(conversationId, studentId, "student");
  },

  async _getMessages(
    conversationId: string,
    userId: string,
    _role: "counselor" | "student",
  ) {
    try {
      const messagesRef = collection(
        db,
        "conversations",
        conversationId,
        "messages",
      );
      // Do not force `createdAt` ordering: some older rows use `created_at`.
      const snapshot = await getDocs(messagesRef);
      return await buildChatMessagesFromQuerySnapshot(snapshot, userId);
    } catch(error: unknown) {
      console.error("❌ Error getting messages:", error);
      throw error;
    }
  },

  async markConversationAsRead(
    conversationId: string,
    viewerId: string,
  ): Promise<void> {
    try {
      const convRef = doc(db, "conversations", conversationId);
      const convSnap = await getDoc(convRef);
      const conv = convSnap.data();
      if (!conv) return;

      const convData = conv as Record<string, unknown>;
      const counselorId = String(convData.counselorId ?? "");
      const studentId = String(convData.studentId ?? "");
      const collegeMap = await fetchUserCollegeMap([
        viewerId,
        counselorId,
        studentId,
      ]);
      const classify = conversationInboxClassifyInput(
        convData,
        collegeMap[viewerId] ?? "",
        collegeMap,
      );
      if (isPastCollegeThread(classify)) {
        return;
      }

      const isCounselorViewer = conv.counselorId === viewerId;
      const unreadField = isCounselorViewer
        ? "unreadCountCounselor"
        : "unreadCountStudent";

      const updates: Promise<unknown>[] = [
        updateDoc(convRef, { [unreadField]: 0 }),
      ];

      const messagesRef = collection(
        db,
        "conversations",
        conversationId,
        "messages",
      );
      const snapshot = await getDocs(messagesRef);
      snapshot.docs.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const senderId = typeof data.senderId === "string" ? data.senderId : "";
        const isRead = data.isRead === true;
        if (senderId && senderId !== viewerId && !isRead) {
          updates.push(
            updateDoc(
              doc(db, "conversations", conversationId, "messages", d.id),
              {
                isRead: true,
                readAt: Timestamp.now(),
              },
            ),
          );
        }
      });

      await Promise.all(updates);
    } catch (error: unknown) {
      console.error("❌ Error marking conversation as read:", error);
    }
  },

  /**
   * Real-time thread messages (student + counselor UIs).
   */
  subscribeConversationMessages(
    conversationId: string,
    userId: string,
    onNext: (messages: unknown[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const messagesRef = collection(
      db,
      "conversations",
      conversationId,
      "messages",
    );
    let generation = 0;
    return onSnapshot(
      messagesRef,
      (snapshot) => {
        const g = ++generation;
        buildChatMessagesFromQuerySnapshot(snapshot, userId)
          .then((msgs) => {
            if (g === generation) onNext(msgs);
          })
          .catch((e) => {
            if (g === generation) {
              onError?.(e instanceof Error ? e : new Error(String(e)));
            }
          });
      },
      (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
    );
  },

  async sendTextMessage(
    conversationId: string,
    senderId: string,
    text: string,
  ) {
    try {
      if ((auth.currentUser?.uid ?? "") !== senderId) {
        throw new Error("You can only send messages as the signed-in user.");
      }
      await this.assertConversationMessagingOpen(conversationId, senderId);
      const out = await sendTextMessageTrustedCallable({
        conversationId,
        text,
      });
      if (conversationId.startsWith(`${senderId}_`)) {
        await this.counselorClearInboxArchive(senderId, conversationId);
      }
      return out.messageId;
    } catch(error: unknown) {
      console.error("❌ Error sending message:", error);
      const err = error as { code?: string; customData?: { details?: unknown }; details?: unknown };
      if (String(err?.code ?? "").includes("resource-exhausted")) {
        const details = err?.customData?.details ?? err?.details;
        const retryAfter =
          details &&
          typeof details === "object" &&
          typeof (details as { retryAfterSeconds?: unknown }).retryAfterSeconds ===
            "number"
            ? Number(
                (details as { retryAfterSeconds?: number }).retryAfterSeconds,
              )
            : null;
        if (retryAfter && retryAfter > 0) {
          throw new Error(
            `You're sending too fast. Please wait ${retryAfter}s and try again.`,
          );
        }
        throw new Error("You're sending too fast. Please wait a moment.");
      }
      throw error;
    }
  },

  async markConversationReadForStudent(
    conversationId: string,
    studentId: string,
  ) {
    try {
      const batch = writeBatch(db);
      const convRef = doc(db, "conversations", conversationId);

      // Clear unread counter on conversation row.
      batch.update(convRef, {
        unreadCountStudent: 0,
      });

      // Mark unread inbound messages as read.
      const messagesRef = collection(
        db,
        "conversations",
        conversationId,
        "messages",
      );
      const unreadSnap = await getDocs(
        query(messagesRef, where("isRead", "==", false)),
      );
      unreadSnap.docs.forEach((msg) => {
        const d = msg.data();
        if (d.senderId !== studentId) {
          batch.update(
            doc(db, "conversations", conversationId, "messages", msg.id),
            {
              isRead: true,
              readAt: Timestamp.now(),
            },
          );
        }
      });

      await batch.commit();
    } catch(error: unknown) {
      console.error("❌ Error marking student conversation as read:", error);
    }
  },

  async sendSessionMessage(
    conversationId: string,
    senderId: string,
    session: Record<string, unknown>,
  ) {
    try {
      await this.assertConversationMessagingOpen(conversationId, senderId);
      const messagesRef = collection(
        db,
        "conversations",
        conversationId,
        "messages",
      );
      const sidFromId = session?.id != null ? String(session.id).trim() : "";
      const sidFromField =
        session?.sessionId != null ? String(session.sessionId).trim() : "";
      const linkedSessionId = sidFromId || sidFromField || null;
      const sessionData =
        linkedSessionId != null
          ? { ...session, id: linkedSessionId, sessionId: linkedSessionId }
          : session;
      const docRef = await addDoc(messagesRef, {
        senderId,
        content: `Session: ${session.title ?? "Appointment"}`,
        type: "session_invite",
        sessionId: null,
        linkedSessionId,
        sessionData,
        isRead: false,
        readAt: null,
        isUrgent: false,
        createdAt: Timestamp.now(),
      });
      const msgId = docRef.id;
      await updateDoc(
        doc(db, "conversations", conversationId, "messages", msgId),
        {
          sessionId: msgId,
          linkedSessionId,
        },
      );
      const convRef = doc(db, "conversations", conversationId);
      const convSnap = await getDoc(convRef);
      const conv = convSnap.data();
      const isCounselor = conv?.counselorId === senderId;
      const updatePayload: Record<string, unknown> = {
        lastMessage: `Session: ${session.title ?? "Appointment"}`,
        lastMessageAt: Timestamp.now(),
        lastSenderId: senderId,
      };
      if (isCounselor) {
        updatePayload.unreadCountStudent = (conv?.unreadCountStudent ?? 0) + 1;
        await this.counselorClearInboxArchive(senderId, conversationId);
      } else
        updatePayload.unreadCountCounselor =
          (conv?.unreadCountCounselor ?? 0) + 1;
      await updateDoc(convRef, updatePayload);
      return msgId;
    } catch(error: unknown) {
      console.error("❌ Error sending session message:", error);
      throw error;
    }
  },

  /**
   * Deletes a single conversation message card (chat-only).
   * This should NOT delete/modify the canonical `sessions` docs.
   */
  async deleteConversationMessage(
    conversationId: string,
    messageId: string,
    senderId?: string,
  ) {
    try {
      if (senderId) {
        await this.assertConversationMessagingOpen(conversationId, senderId);
      }
      await deleteDoc(
        doc(db, "conversations", conversationId, "messages", messageId),
      );
    } catch(error: unknown) {
      console.error("❌ Error deleting conversation message:", error);
      throw error;
    }
  },

  /**
   * Updates an existing `session_invite` message card (no new message doc).
   * Used to prevent chat/session-card flooding when editing/rescheduling.
   */
  async updateSessionInviteMessage(
    conversationId: string,
    messageId: string,
    senderId: string,
    session: Record<string, unknown>,
  ) {
    try {
      await this.assertConversationMessagingOpen(conversationId, senderId);
      const linkedSessionId =
        session?.id != null
          ? String(session.id).trim()
          : session?.sessionId != null
            ? String(session.sessionId).trim()
            : "";

      const sessionData = linkedSessionId
        ? { ...session, id: linkedSessionId, sessionId: linkedSessionId }
        : session;

      await updateDoc(
        doc(db, "conversations", conversationId, "messages", messageId),
        {
          sessionId: messageId, // match sendSessionMessage behavior
          linkedSessionId: linkedSessionId || null,
          sessionData,
          content: `Session: ${session.title ?? "Appointment"}`,
        },
      );

      // Update conversation preview/time, but do NOT bump unread counters.
      const convRef = doc(db, "conversations", conversationId);
      const convSnap = await getDoc(convRef);
      const conv = convSnap.data();
      if (conv?.counselorId === senderId) {
        await this.counselorClearInboxArchive(senderId, conversationId);
      }

      await updateDoc(convRef, {
        lastMessage: `Session: ${session.title ?? "Appointment"}`,
        lastMessageAt: Timestamp.now(),
        lastSenderId: senderId,
      });

      return messageId;
    } catch(error: unknown) {
      console.error("❌ Error updating session invite message:", error);
      throw error;
    }
  },

  /**
   * Replace the existing session_invite card for `sessions/{sessionId}` with the new schedule.
   * - keeps the newest matching card
   * - deletes older duplicates
   * - if no card exists yet, falls back to `sendSessionMessage` (creates first card)
   */
  async updateSessionInviteMessageScheduleForSession(
    conversationId: string,
    senderId: string,
    sessionId: string,
    session: Record<string, unknown>,
  ) {
    try {
      await this.assertConversationMessagingOpen(conversationId, senderId);
      await this.assertSessionMessagingOpen(sessionId, senderId);
      const messagesRef = collection(
        db,
        "conversations",
        conversationId,
        "messages",
      );
      const snapshot = await getDocs(
        query(messagesRef, where("linkedSessionId", "==", sessionId)),
      );

      const sessionInviteDocs = snapshot.docs.filter((d) => {
        const data = d.data() as Record<string, unknown>;
        return data.type === "session_invite" && data.senderId === senderId;
      });

      if (sessionInviteDocs.length === 0) {
        return await this.sendSessionMessage(conversationId, senderId, session);
      }

      const toMs = (v: Record<string, unknown> | null | undefined): number => {
        if (!v) return 0;
        if (typeof v?.toMillis === "function") return v.toMillis();
        if (typeof v?.seconds === "number") return v.seconds * 1000;
        if (typeof v === "number") return v;
        return 0;
      };

      const keepDoc = sessionInviteDocs
        .slice()
        .sort(
          (a, b) =>
            toMs((b.data() as Record<string, unknown>).createdAt as Record<string, unknown> | null | undefined) -
            toMs((a.data() as Record<string, unknown>).createdAt as Record<string, unknown> | null | undefined),
        )[0];

      const keepMessageId = keepDoc.id;

      // Remove duplicates so the conversation doesn't get flooded.
      await Promise.all(
        sessionInviteDocs
          .filter((d) => d.id !== keepMessageId)
          .map((d) =>
            deleteDoc(
              doc(db, "conversations", conversationId, "messages", d.id),
            ),
          ),
      );

      await this.updateSessionInviteMessage(
        conversationId,
        keepMessageId,
        senderId,
        session,
      );
      return keepMessageId;
    } catch(error: unknown) {
      console.error(
        "❌ Error updating session invite message schedule:",
        error,
      );
      throw error;
    }
  },

  async sendSessionRequest(
    conversationId: string,
    studentId: string,
    preferredDate: Date,
    note: string,
  ) {
    try {
      const preferredTimeStr = preferredDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      if ((auth.currentUser?.uid ?? "") !== studentId) {
        throw new Error(
          "You can only request sessions as the signed-in student.",
        );
      }
      await this.assertConversationMessagingOpen(conversationId, studentId);
      const out = await sendSessionRequestTrustedCallable({
        conversationId,
        preferredTime: preferredTimeStr,
        note,
      });
      return out.messageId;
    } catch (error: unknown) {
      console.error("❌ Error sending session request:", error);
      const err = error as { code?: string; customData?: { details?: unknown }; details?: unknown };
      if (String(err?.code ?? "").includes("resource-exhausted")) {
        const details = err?.customData?.details ?? err?.details;
        const retryAfter =
          details &&
          typeof details === "object" &&
          typeof (details as { retryAfterSeconds?: unknown }).retryAfterSeconds ===
            "number"
            ? Number(
                (details as { retryAfterSeconds?: number }).retryAfterSeconds,
              )
            : null;
        if (retryAfter && retryAfter > 0) {
          throw new Error(
            `Session request sent too recently. Please wait ${retryAfter}s and try again.`,
          );
        }
        throw new Error(
          "Session request sent too recently. Please wait a moment.",
        );
      }
      throw error;
    }
  },

  // ─── Sessions (counseling appointments) ─────────────────────────────────────
  // sessions/{sessionId}: counselorId, studentId, riskFlagId, initiatedBy, studentRequestNote,
  //   finalSlot (agreed date+time — single source for history badges & overdue; set when either party confirms),
  //   proposedSlots, confirmedSlot (kept in sync with finalSlot when agreed), status, attendanceNote, cancelReason,
  //   slotConfirmedAt (Timestamp when final/agreed time was last locked as confirmed),
  //   reminderSent, createdAt, updatedAt, expiredAt, schedulingOverdueAt, sessionHistoryBadge
  // status: requested | pending | confirmed | needs_rescheduling | expired | completed | missed | rescheduled | cancelled

  /**
   * Counselor-initiated invite: creates `sessions/{id}` with proposed slots so the student can
   * confirm via `studentConfirmFinalSlot` using this document id (not a client `session_*` placeholder).
   */
  async createCounselorSessionInvite(
    counselorId: string,
    studentId: string,
    proposedSlots: Array<{ date: string; time: string }>,
    opts?: { note?: string },
  ) {
    try {
      await this.assertMessagingOpenForParticipants(
        counselorId,
        studentId,
        counselorId,
      );
      const collegeCode = await resolveConversationCollegeCode(
        counselorId,
        studentId,
      );
      const docData: Record<string, unknown> = {
        counselorId,
        studentId,
        ...(collegeCode ? { college_code: collegeCode } : {}),
        riskFlagId: null,
        initiatedBy: "counselor",
        studentRequestNote: (opts?.note ?? "").trim(),
        proposedSlots,
        confirmedSlot: null,
        finalSlot: null,
        status: "pending",
        attendanceNote: null,
        cancelReason: null,
        reminderSent: false,
        sessionHistoryBadge: "pending",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, "sessions"), docData);
      await createSessionNotification(
        studentId,
        "Your counselor sent a session invitation. Open Messages to review and confirm your preferred slot.",
        "/(student)/messages",
        `session:${docRef.id}:counselor_invite_created`,
      );
      return docRef.id;
    } catch(error: unknown) {
      console.error("❌ Error creating counselor session invite:", error);
      throw error;
    }
  },

  async getSessionsForStudent(
    studentId: string,
    options?: { activeCollegeCode?: string | null },
  ) {
    try {
      const activeCollege = await resolveUserActiveCollegeCode(
        studentId,
        options?.activeCollegeCode,
      );
      const q = query(
        collection(db, "sessions"),
        where("studentId", "==", studentId),
        orderBy("updatedAt", "desc"),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .filter((d) =>
          conversationMatchesActiveCollege(
            d.data() as Record<string, unknown>,
            activeCollege,
          ),
        )
        .map((d) => ({ id: d.id, ...d.data() }));
    } catch(error: unknown) {
      console.error("❌ Error getting student sessions:", error);
      throw error;
    }
  },

  async getSessionsForCounselor(
    counselorId: string,
    options?: { activeCollegeCode?: string | null },
  ) {
    try {
      const activeCollege = await resolveUserActiveCollegeCode(
        counselorId,
        options?.activeCollegeCode,
      );
      const q = query(
        collection(db, "sessions"),
        where("counselorId", "==", counselorId),
        orderBy("updatedAt", "desc"),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .filter((d) =>
          conversationMatchesActiveCollege(
            d.data() as Record<string, unknown>,
            activeCollege,
          ),
        )
        .map((d) => ({ id: d.id, ...d.data() }));
    } catch(error: unknown) {
      console.error("❌ Error getting counselor sessions:", error);
      throw error;
    }
  },

  /**
   * Counts `sessions` with this student and counselor where `status` is terminal
   * `completed` or `missed` (same semantics as Session History).
   * Query uses both participant IDs so it stays compatible with strict rules.
   */
  async getSessionOutcomeCountsForCounselorStudent(
    counselorId: string,
    studentId: string,
    options?: { activeCollegeCode?: string | null },
  ): Promise<{ completed: number; missed: number }> {
    try {
      const activeCollege = await resolveUserActiveCollegeCode(
        counselorId,
        options?.activeCollegeCode,
      );
      const q = query(
        collection(db, "sessions"),
        where("counselorId", "==", String(counselorId)),
        where("studentId", "==", String(studentId)),
      );
      const snapshot = await getDocs(q);
      let completed = 0;
      let missed = 0;
      for (const d of snapshot.docs) {
        const data = d.data() as Record<string, unknown>;
        if (!conversationMatchesActiveCollege(data, activeCollege)) continue;
        const st = String(data.status ?? "");
        if (st === "completed") completed += 1;
        else if (st === "missed") missed += 1;
      }
      return { completed, missed };
    } catch(error: unknown) {
      console.error(
        "❌ Error counting session outcomes for counselor/student:",
        error,
      );
      return { completed: 0, missed: 0 };
    }
  },

  async proposeSlots(
    sessionId: string,
    slots: Array<{ date: string; time: string }>,
    opts?: {
      /** Counselor moved a session (e.g. from attendance "needs rescheduling"). */
      proposalKind?: "attendance_reschedule" | "counselor_new_times";
      actorId?: string;
    },
  ) {
    try {
      const actorId = opts?.actorId ?? auth.currentUser?.uid ?? "";
      if (actorId) {
        await this.assertSessionMessagingOpen(sessionId, actorId);
      }
      const sessionRef = doc(db, "sessions", sessionId);
      const snap = await getDoc(sessionRef);
      const session = snap.data() as Record<string, unknown> | undefined;
      await updateDoc(sessionRef, {
        proposedSlots: slots,
        finalSlot: null,
        confirmedSlot: null,
        slotConfirmedAt: deleteField(),
        status: "pending",
        updatedAt: Timestamp.now(),
        ...(opts?.proposalKind === "attendance_reschedule"
          ? { counselorRescheduleAt: Timestamp.now() }
          : {}),
      });
      if (session?.studentId) {
        let body =
          "Your counselor proposed new session times. Please choose and confirm a slot in Messages.";
        if (opts?.proposalKind === "attendance_reschedule") {
          body =
            "Your counselor needs to reschedule. Open Messages, read their note, and choose a new time on the session card—this is not a new request from you.";
        } else if (opts?.proposalKind === "counselor_new_times") {
          body =
            "Your counselor suggested new times. Open Messages and pick a slot on the session card.";
        }
        await createSessionNotification(
          String(session.studentId),
          body,
          "/(student)/messages",
          `session:${sessionId}:slots_proposed_to_student`,
        );
      }
    } catch(error: unknown) {
      console.error("❌ Error proposing slots:", error);
      throw error;
    }
  },

  async confirmSlot(
    sessionId: string,
    slot: { date: string; time: string },
    actorId?: string,
  ) {
    try {
      const uid = actorId ?? auth.currentUser?.uid ?? "";
      if (uid) {
        await this.assertSessionMessagingOpen(sessionId, uid);
      }
      const sessionRef = doc(db, "sessions", sessionId);
      const snap = await getDoc(sessionRef);
      const session = snap.data() as Record<string, unknown> | undefined;
      await updateDoc(sessionRef, {
        finalSlot: slot,
        confirmedSlot: slot,
        status: "confirmed",
        slotConfirmedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      if (session?.studentId) {
        await createSessionNotification(
          String(session.studentId),
          `Your session has been confirmed for ${slot.date} at ${slot.time}.`,
          "/(student)/messages",
          `session:${sessionId}:confirmed_for_student`,
        );
      }
    } catch(error: unknown) {
      console.error("❌ Error confirming slot:", error);
      throw error;
    }
  },

  /**
   * Student picks one of the counselor's proposed times — locks `finalSlot` (same as counselor confirm path).
   * Optional `conversationId` + `counselorId` recover legacy/missing `studentId` on the session doc when the
   * conversation proves this student belongs to the thread with that counselor.
   */
  async studentConfirmFinalSlot(
    sessionId: string,
    studentId: string,
    slot: { date: string; time: string },
    opts?: { conversationId?: string; counselorId?: string },
  ) {
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      const snap = await getDoc(sessionRef);
      if (!snap.exists()) throw new Error("Session not found");
      const data = snap.data()!;
      const uid = String(studentId);

      let authorized = data.studentId != null && String(data.studentId) === uid;

      if (
        !authorized &&
        data.studentId == null &&
        opts?.conversationId &&
        opts?.counselorId
      ) {
        const convSnap = await getDoc(
          doc(db, "conversations", opts.conversationId),
        );
        const conv = convSnap.data();
        const counselorOk =
          String(data.counselorId ?? "") === String(opts.counselorId);
        const studentOk = conv != null && String(conv.studentId ?? "") === uid;
        if (counselorOk && studentOk) {
          authorized = true;
        }
      }

      if (!authorized) throw new Error("Not authorized");

      const counselorIdForCheck = String(data.counselorId ?? "");
      const studentIdForCheck = String(data.studentId ?? uid);
      if (counselorIdForCheck && studentIdForCheck) {
        await this.assertMessagingOpenForParticipants(
          counselorIdForCheck,
          studentIdForCheck,
          uid,
        );
      }

      const patch: Record<string, unknown> = {
        finalSlot: slot,
        confirmedSlot: slot,
        status: "confirmed",
        slotConfirmedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      if (data.studentId == null) {
        patch.studentId = uid;
      }
      await updateDoc(sessionRef, patch as Record<string, unknown>);
      if (data?.counselorId) {
        await createSessionNotification(
          String(data.counselorId),
          `A student confirmed the session for ${slot.date} at ${slot.time}.`,
          "/(counselor)/messages",
          `session:${sessionId}:confirmed_for_counselor`,
        );
      }
    } catch(error: unknown) {
      console.error("❌ Error confirming final slot:", error);
      throw error;
    }
  },

  /**
   * Update session request message status in conversation so it persists on refresh.
   * Call this after confirmSlot so the message shows "Accepted" instead of buttons.
   */
  async updateSessionRequestMessageStatus(
    conversationId: string,
    sessionId: string,
    status: "confirmed" | "cancelled",
    senderId: string,
  ) {
    try {
      await this.assertConversationMessagingOpen(conversationId, senderId);
      const messagesRef = collection(
        db,
        "conversations",
        conversationId,
        "messages",
      );
      const snapshot = await getDocs(
        query(messagesRef, orderBy("createdAt", "asc")),
      );
      const updates: Promise<void>[] = [];
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (
          data.type === "session_request" &&
          (data.sessionId === sessionId ||
            data.sessionData?.sessionId === sessionId)
        ) {
          const existingSessionData = data.sessionData ?? {};
          updates.push(
            updateDoc(
              doc(db, "conversations", conversationId, "messages", d.id),
              {
                sessionData: { ...existingSessionData, status },
              },
            ),
          );
        }
      });
      await Promise.all(updates);
    } catch(error: unknown) {
      console.error("❌ Error updating session request message status:", error);
      throw error;
    }
  },

  /**
   * Updates an existing student session request message (edit/reschedule) in-place
   * so it replaces the old card instead of creating a new one.
   */
  async updateSessionRequestSchedule(
    conversationId: string,
    senderId: string,
    messageId: string,
    sessionId: string,
    preferredTime: string,
    note: string,
  ) {
    try {
      await this.assertConversationMessagingOpen(conversationId, senderId);
      await this.assertSessionMessagingOpen(sessionId, senderId);
      const trimmedNote = (note ?? "").trim();
      const content = preferredTime
        ? `Session request: ${preferredTime}`
        : "Session request";

      // Update the canonical session doc.
      await updateDoc(doc(db, "sessions", sessionId), {
        preferredTimeFromStudent: preferredTime,
        studentRequestNote: trimmedNote,
        status: "requested",
        updatedAt: Timestamp.now(),
      });

      // Update the existing chat message card.
      const msgRef = doc(
        db,
        "conversations",
        conversationId,
        "messages",
        messageId,
      );
      const msgSnap = await getDoc(msgRef);
      const existing = msgSnap.data();
      const existingSessionData = (existing?.sessionData ?? {}) as Record<string, unknown>;

      await updateDoc(msgRef, {
        content,
        sessionData: {
          ...existingSessionData,
          sessionId,
          note: trimmedNote,
          status: "requested",
          ...(preferredTime ? { preferredTime } : {}),
        },
      });

      // Update conversation preview/last message without changing unread counters.
      const convRef = doc(db, "conversations", conversationId);
      await updateDoc(convRef, {
        lastMessage: content,
        lastMessageAt: Timestamp.now(),
        lastSenderId: senderId,
      });
    } catch(error: unknown) {
      console.error("❌ Error updating session request schedule:", error);
      throw error;
    }
  },

  /**
   * Deletes `sessions` docs that have been `expired` for more than 7 days (counselor scope).
   */
  async purgeExpiredSessionsPastRetention(
    counselorId: string,
    activeCollegeCode?: string | null,
  ): Promise<void> {
    try {
      const activeCollege = await resolveUserActiveCollegeCode(
        counselorId,
        activeCollegeCode,
      );
      const q = query(
        collection(db, "sessions"),
        where("counselorId", "==", counselorId),
        where("status", "==", "expired"),
      );
      const snapshot = await getDocs(q);
      const cutoff = Date.now() - EXPIRED_SESSION_RETENTION_MS;
      const deletes = snapshot.docs
        .filter((d) =>
          conversationMatchesActiveCollege(
            d.data() as Record<string, unknown>,
            activeCollege,
          ),
        )
        .filter((d) => {
          const ea = d.data().expiredAt?.toMillis?.();
          return typeof ea === "number" && ea < cutoff;
        })
        .map((d) => deleteDoc(doc(db, "sessions", d.id)));
      await Promise.all(deletes);
    } catch (e) {
      console.error("❌ Error purging expired sessions:", e);
    }
  },

  async markSessionAttendance(
    sessionId: string,
    outcome: "completed" | "missed" | "rescheduled",
    attendanceNote?: string,
    actorId?: string,
  ) {
    try {
      const uid = actorId ?? auth.currentUser?.uid ?? "";
      if (uid) {
        await this.assertSessionMessagingOpen(sessionId, uid);
      }
      const sessionRef = doc(db, "sessions", sessionId);
      const badge: SessionHistoryBadge =
        outcome === "completed"
          ? "completed"
          : outcome === "missed"
            ? "missed"
            : "pending";
      await updateDoc(sessionRef, {
        status: outcome,
        attendanceNote: attendanceNote ?? null,
        updatedAt: Timestamp.now(),
        expiredAt: null,
        schedulingOverdueAt: null,
        sessionHistoryBadge: badge,
        ...(outcome === "rescheduled"
          ? {
              finalSlot: null,
              confirmedSlot: null,
              slotConfirmedAt: deleteField(),
            }
          : {}),
      });
    } catch(error: unknown) {
      console.error("❌ Error marking attendance:", error);
      throw error;
    }
  },

  /**
   * Get session history for counselor with enriched student data (name, program).
   * **Agreed sessions only:** rows must have a locked `finalSlot` / `confirmedSlot`, or a terminal
   * attendance outcome (`completed`, `missed`, `rescheduled` — the last clears slots but stays listed).
   * Excludes open student requests and invite/pending flows where no time is locked yet.
   */
  async getSessionHistoryForCounselor(
    counselorId: string,
    options?: { activeCollegeCode?: string | null },
  ): Promise<
    Array<{
      id: string;
      studentId: string;
      studentName: string;
      studentAvatar?: string;
      studentProgram?: string;
      studentYear?: string;
      status: string;
      finalSlot: { date: string; time: string } | null;
      confirmedSlot: { date: string; time: string } | null;
      proposedSlots: Array<{ date: string; time: string }>;
      preferredTimeFromStudent?: string;
      studentRequestNote?: string;
      attendanceNote?: string;
      cancelReason?: string;
      sessionHistoryBadge?: SessionHistoryBadge;
      updatedAt: Date;
      createdAt: Date;
      initiatedBy?: string;
      /** When the agreed slot was last confirmed (student or counselor path). */
      slotConfirmedAt: Date | null;
    }>
  > {
    try {
      const activeCollege = await resolveUserActiveCollegeCode(
        counselorId,
        options?.activeCollegeCode,
      );
      await this.purgeExpiredSessionsPastRetention(counselorId, activeCollege);

      const q = query(
        collection(db, "sessions"),
        where("counselorId", "==", counselorId),
        orderBy("updatedAt", "desc"),
      );
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs
        .filter((d) =>
          conversationMatchesActiveCollege(
            d.data() as Record<string, unknown>,
            activeCollege,
          ),
        )
        .map((d) => {
        const data = d.data();
        const rawProposed = Array.isArray(data.proposedSlots)
          ? data.proposedSlots
          : [];
        const proposedSlots = rawProposed
          .map(
            (p: unknown) =>
              normalizeFirestoreSessionSlot(p) ?? looseSessionSlotFromRaw(p),
          )
          .filter((x): x is { date: string; time: string } => x != null);
        const finalSlot =
          normalizeFirestoreSessionSlot(data.finalSlot) ??
          looseSessionSlotFromRaw(data.finalSlot);
        const confirmedSlot =
          normalizeFirestoreSessionSlot(data.confirmedSlot) ??
          looseSessionSlotFromRaw(data.confirmedSlot);
        const slotConfirmedRaw = data.slotConfirmedAt;
        const slotConfirmedAt =
          slotConfirmedRaw != null &&
          typeof (slotConfirmedRaw as { toDate?: () => Date }).toDate ===
            "function"
            ? (slotConfirmedRaw as { toDate: () => Date }).toDate()
            : null;
        return {
          id: d.id,
          studentId:
            data.studentId != null && String(data.studentId).trim()
              ? String(data.studentId).trim()
              : "",
          status: data.status ?? "requested",
          finalSlot,
          confirmedSlot,
          proposedSlots,
          preferredTimeFromStudent: data.preferredTimeFromStudent,
          studentRequestNote: data.studentRequestNote,
          attendanceNote: data.attendanceNote,
          cancelReason: data.cancelReason,
          sessionHistoryBadge: data.sessionHistoryBadge as
            | SessionHistoryBadge
            | undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          initiatedBy:
            typeof data.initiatedBy === "string" ? data.initiatedBy : undefined,
          slotConfirmedAt,
        };
      });

      const sessionsAgreedOnly = sessions.filter((s) => {
        const st = String(s.status ?? "").toLowerCase();
        if (st === "completed" || st === "missed" || st === "rescheduled") {
          return true;
        }
        return (
          getConfirmedFinalSlot(
            s as { finalSlot?: unknown; confirmedSlot?: unknown },
          ) != null
        );
      });

      // Enrich with student data
      const uniqueStudentIds = [
        ...new Set(
          sessionsAgreedOnly
            .map((s) => s.studentId)
            .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
        ),
      ];
      const userPromises = uniqueStudentIds.map((id) =>
        getDoc(doc(db, "users", id)),
      );
      const userSnaps = await Promise.all(userPromises);
      const userMap: Record<
        string,
        {
          full_name?: string;
          department?: string;
          college_code?: string;
          program?: string;
          year?: string;
          avatar_url?: string;
        }
      > = {};
      userSnaps.forEach((snap, i) => {
        const uid = uniqueStudentIds[i];
        const u = snap.data();
        const pickAvatar = (raw: Record<string, unknown> | undefined) => {
          if (!raw) return undefined;
          const a =
            (typeof raw.avatar_url === "string" && raw.avatar_url.trim()) ||
            (typeof raw.avatarUrl === "string" && raw.avatarUrl.trim()) ||
            (typeof raw.photoURL === "string" && raw.photoURL.trim()) ||
            (typeof raw.photoUrl === "string" && raw.photoUrl.trim()) ||
            "";
          return a || undefined;
        };
        userMap[uid] = {
          full_name: u?.full_name ?? u?.fullName,
          department: u?.department,
          college_code:
            typeof u?.college_code === "string" && u.college_code.trim()
              ? u.college_code.trim()
              : undefined,
          program: u?.program,
          year: u?.year ?? u?.year_level,
          avatar_url: pickAvatar(u as Record<string, unknown> | undefined),
        };
      });

      const syncSchedulingStatus = async (
        s: (typeof sessions)[0],
      ): Promise<string> => {
        const status = s.status;
        const terminal = ["completed", "missed", "cancelled", "rescheduled"];
        if (terminal.includes(status)) return status;

        const scheduled = getSessionScheduledDate({
          finalSlot: s.finalSlot,
          confirmedSlot: s.confirmedSlot,
          proposedSlots: s.proposedSlots,
          preferredTimeFromStudent: s.preferredTimeFromStudent,
        });
        if (!scheduled) return status;

        const overdue = getOverdueSchedulingState(scheduled);
        if (overdue === "none") return status;

        try {
          if (overdue === "expired") {
            if (status !== "expired") {
              await updateDoc(doc(db, "sessions", s.id), {
                status: "expired",
                expiredAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
            }
            return "expired";
          }
          if (overdue === "needs_rescheduling") {
            if (["confirmed", "pending", "requested"].includes(status)) {
              await updateDoc(doc(db, "sessions", s.id), {
                status: "needs_rescheduling",
                schedulingOverdueAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
              return "needs_rescheduling";
            }
            if (status === "needs_rescheduling") return status;
          }
        } catch {
          // ignore failed writes
        }
        return status;
      };

      const results = await Promise.all(
        sessionsAgreedOnly.map(async (s) => {
          const status = await syncSchedulingStatus(s);
          const merged = { ...s, status };
          const badge = computeSessionHistoryBadge(merged);
          if (badge !== s.sessionHistoryBadge) {
            try {
              await updateDoc(doc(db, "sessions", s.id), {
                sessionHistoryBadge: badge,
              });
            } catch {
              /* ignore */
            }
          }
          return {
            ...merged,
            sessionHistoryBadge: badge,
            studentName: userMap[s.studentId]?.full_name ?? "Unknown Student",
            studentAvatar: userMap[s.studentId]?.avatar_url,
            studentDepartment:
              userMap[s.studentId]?.college_code ||
              userMap[s.studentId]?.department,
            studentProgram: userMap[s.studentId]?.program,
            studentYear: userMap[s.studentId]?.year,
          };
        }),
      );

      return results;
    } catch(error: unknown) {
      console.error("❌ Error getting session history:", error);
      throw error;
    }
  },
};

async function buildChatMessagesFromQuerySnapshot(
  snapshot: QuerySnapshot,
  userId: string,
) {
  const docsSorted = [...snapshot.docs].sort((a, b) => {
    const aMs = resolveMessageCreatedAtMillis(a.data() as Record<string, unknown>);
    const bMs = resolveMessageCreatedAtMillis(b.data() as Record<string, unknown>);
    return aMs - bMs;
  });

  const msgs = docsSorted.map((d) => {
    const data = d.data();
    const createdAt = resolveMessageCreatedAtDate(data as Record<string, unknown>);
    const isMe = data.senderId === userId;
    const senderId = isMe ? "me" : "them";
    if (data.type === "session_invite") {
      const rawSession = (data.sessionData ?? data.session ?? {}) as Record<
        string,
        unknown
      >;
      const resolved = resolveSessionsDocIdFromInviteMessageData(
        data as Record<string, unknown>,
      );
      const fallbackNested =
        (rawSession.id != null && String(rawSession.id).trim()) ||
        (rawSession.sessionId != null && String(rawSession.sessionId).trim()) ||
        "";
      const id = (resolved || fallbackNested || "").trim();
      const sessionForCard = {
        ...rawSession,
        id,
        ...(id && !isPlaceholderSessionDocId(id)
          ? { linkedSessionId: id, sessionId: id }
          : {}),
      };
      return {
        id: d.id,
        senderId,
        type: "session" as const,
        session: sessionForCard,
        time: formatMessageTime(createdAt),
      };
    }
    if (data.type === "session_request") {
      const req = data.sessionData ?? {};
      const sid = data.sessionId ?? req.sessionId ?? null;
      return {
        id: d.id,
        senderId,
        type: "session_request" as const,
        sessionRequest: {
          id: d.id,
          sessionId: sid,
          preferredTime: req.preferredTime ?? "",
          note: req.note ?? "",
          status: req.status ?? "pending",
          requestedAtMs: createdAt.getTime(),
        },
        time: formatMessageTime(createdAt),
      };
    }
    return {
      id: d.id,
      senderId,
      type: "text" as const,
      text: data.content ?? "",
      time: formatMessageTime(createdAt),
    };
  });

  const sessionRequestMsgs = msgs.filter((m) => m.type === "session_request");
  const sessionInviteMsgs = msgs.filter((m) => m.type === "session");
  const requestSessionIds = [
    ...new Set(
      sessionRequestMsgs.map((m) => m.sessionRequest.sessionId).filter(Boolean),
    ),
  ] as string[];
  const inviteSessionIds = [
    ...new Set(
      sessionInviteMsgs
        .map((m) =>
          resolveSessionsDocIdForSessionCard(
            m.session as Record<string, unknown>,
          ),
        )
        .filter(Boolean),
    ),
  ] as string[];
  const allSessionIds = [
    ...new Set([...requestSessionIds, ...inviteSessionIds]),
  ];

  const sessionStatusMap: Record<string, string> = {};
  const sessionFinalSlotMap: Record<
    string,
    { date: string; time: string } | null
  > = {};
  const sessionHasProposedSlotsMap: Record<string, boolean> = {};
  /** Present when `sessions/{id}` exists — used for student 24h open-invite expiry. */
  const sessionDocTimestampsMap: Record<
    string,
    { createdAt?: unknown; updatedAt?: unknown }
  > = {};
  if (allSessionIds.length > 0) {
    const sessionPromises = allSessionIds.map(async (id) => {
      try {
        return await getDoc(doc(db, "sessions", id));
      } catch {
        // Keep chat rendering even when one linked session is inaccessible.
        return null;
      }
    });
    const sessionSnaps = await Promise.all(sessionPromises);
    sessionSnaps.forEach((snap, i) => {
      if (!snap) return;
      const sid = allSessionIds[i];
      const s = snap.data();
      if (!s) return;
      if (s?.status) sessionStatusMap[sid] = s.status;
      sessionDocTimestampsMap[sid] = {
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
      const slots = s?.proposedSlots;
      sessionHasProposedSlotsMap[sid] =
        Array.isArray(slots) &&
        slots.some(
          (x: unknown) =>
            x &&
            typeof x === "object" &&
            "date" in (x as object) &&
            String((x as { date: unknown }).date).trim() !== "",
        );
      const fs = s?.finalSlot ?? s?.confirmedSlot;
      if (fs && typeof fs === "object" && "date" in fs && "time" in fs) {
        sessionFinalSlotMap[sid] = {
          date: String(fs.date),
          time: String(fs.time),
        };
      } else {
        sessionFinalSlotMap[sid] = null;
      }
    });
  }

  return msgs.map((m) => {
    if (m.type === "session_request" && m.sessionRequest.sessionId) {
      const sessionStatus = sessionStatusMap[m.sessionRequest.sessionId];
      const sid = m.sessionRequest.sessionId;
      const hasProposed = sessionHasProposedSlotsMap[sid];
      if (
        sessionStatus &&
        [
          "requested",
          "pending",
          "confirmed",
          "completed",
          "missed",
          "rescheduled",
          "cancelled",
          "needs_rescheduling",
          "expired",
        ].includes(sessionStatus)
      ) {
        return {
          ...m,
          sessionRequest: {
            ...m.sessionRequest,
            status: sessionStatus,
            counselorOfferedSlots:
              sessionStatus === "pending" && !!hasProposed,
          },
        };
      }
    }
    if (m.type === "session") {
      const sid = resolveSessionsDocIdForSessionCard(
        m.session as Record<string, unknown>,
      );
      if (sid && (sessionStatusMap[sid] || sessionDocTimestampsMap[sid])) {
        const fs = sessionFinalSlotMap[sid];
        const ts = sessionDocTimestampsMap[sid];
        const stFromDoc = sessionStatusMap[sid];
        const stFromMsg = (m.session as Record<string, unknown>)?.sessionStatus;
        const sessionStatus =
          typeof stFromDoc === "string" && stFromDoc.trim()
            ? stFromDoc.trim()
            : typeof stFromMsg === "string" && stFromMsg.trim()
              ? stFromMsg.trim()
              : "pending";
        return {
          ...m,
          session: {
            ...m.session,
            id: sid,
            linkedSessionId: sid,
            sessionId: sid,
            sessionStatus,
            ...(ts?.createdAt != null
              ? { sessionDocCreatedAt: ts.createdAt }
              : {}),
            ...(ts?.updatedAt != null
              ? { sessionDocUpdatedAt: ts.updatedAt }
              : {}),
            ...(fs ? { agreedSlot: fs } : {}),
          },
        };
      }
    }
    return m;
  });
}

function resolveMessageCreatedAtDate(data: Record<string, unknown>): Date {
  const createdAt = data.createdAt as
    | { toDate?: () => Date }
    | Date
    | string
    | number
    | undefined;
  const createdAtLegacy = data.created_at as
    | { toDate?: () => Date }
    | Date
    | string
    | number
    | undefined;
  const raw = createdAt ?? createdAtLegacy;

  if (raw && typeof raw === "object" && "toDate" in raw) {
    const d = (raw as { toDate?: () => Date }).toDate?.();
    if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  if (typeof raw === "number") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (typeof raw === "string") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

function resolveMessageCreatedAtMillis(data: Record<string, unknown>): number {
  return resolveMessageCreatedAtDate(data).getTime();
}

function formatMessageTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
