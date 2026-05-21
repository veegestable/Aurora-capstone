import type { QuerySnapshot } from "firebase/firestore";
import {
  resolveSessionsDocIdForSessionCard,
  resolveSessionsDocIdFromInviteMessageData,
} from "./sessionInviteIds";

function scheduledStartToMillis(v: unknown): number | null {
  if (
    v != null &&
    typeof v === "object" &&
    typeof (v as { toMillis?: () => number }).toMillis === "function"
  ) {
    const ms = (v as { toMillis: () => number }).toMillis();
    return typeof ms === "number" && Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/** Cached fields from `sessions/{id}` used when rendering chat cards. */
export type LinkedSessionSnapshot = {
  status?: string;
  finalSlot?: { date: string; time: string } | null;
  hasProposedSlots?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  /** Firestore `scheduledStartAt` — authoritative instant (Manila wall time encoded as UTC). */
  scheduledStartMs?: number | null;
};

export function linkedSessionFromFirestoreData(
  s: Record<string, unknown>,
): LinkedSessionSnapshot {
  const slots = s.proposedSlots;
  const hasProposedSlots =
    Array.isArray(slots) &&
    slots.some(
      (x: unknown) =>
        x &&
        typeof x === "object" &&
        "date" in (x as object) &&
        String((x as { date: unknown }).date).trim() !== "",
    );

  const fs = s.finalSlot ?? s.confirmedSlot;
  let finalSlot: { date: string; time: string } | null = null;
  if (fs && typeof fs === "object" && "date" in fs) {
    finalSlot = {
      date: String((fs as { date: unknown }).date),
      time: String((fs as { time?: unknown }).time ?? ""),
    };
  }

  return {
    status: s.status != null ? String(s.status) : undefined,
    finalSlot,
    hasProposedSlots,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    scheduledStartMs: scheduledStartToMillis(s.scheduledStartAt),
  };
}

/** Collect linked `sessions/{id}` ids from a messages query snapshot. */
export function collectLinkedSessionIdsFromSnapshot(
  snapshot: QuerySnapshot,
): string[] {
  const ids = new Set<string>();

  for (const d of snapshot.docs) {
    const data = d.data() as Record<string, unknown>;
    if (data.type === "session_request") {
      const req = (data.sessionData ?? {}) as Record<string, unknown>;
      const sid = data.sessionId ?? req.sessionId;
      if (sid != null && String(sid).trim()) ids.add(String(sid).trim());
    }
    if (data.type === "session_invite") {
      const resolved = resolveSessionsDocIdFromInviteMessageData(data);
      const rawSession = (data.sessionData ?? data.session ?? {}) as Record<
        string,
        unknown
      >;
      const fallback =
        (rawSession.id != null && String(rawSession.id).trim()) ||
        (rawSession.sessionId != null && String(rawSession.sessionId).trim()) ||
        "";
      const id = (resolved || fallback || "").trim();
      if (id) ids.add(id);
    }
  }

  return [...ids];
}

export function applyLinkedSessionMapsToChatMessage(
  m: {
    type: string;
    sessionRequest?: {
      sessionId?: string | null;
      status: string;
      counselorOfferedSlots?: boolean;
      [key: string]: unknown;
    };
    session?: Record<string, unknown>;
  },
  sessionStatusMap: Record<string, string>,
  sessionFinalSlotMap: Record<string, { date: string; time: string } | null>,
  sessionHasProposedSlotsMap: Record<string, boolean>,
  sessionScheduledStartMsMap: Record<string, number | null | undefined>,
  sessionDocTimestampsMap: Record<
    string,
    { createdAt?: unknown; updatedAt?: unknown }
  >,
): typeof m {
  if (m.type === "session_request" && m.sessionRequest?.sessionId) {
    const sid = m.sessionRequest.sessionId;
    const sessionStatus = sessionStatusMap[sid];
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

  if (m.type === "session" && m.session) {
    const sid = resolveSessionsDocIdForSessionCard(m.session);
    if (sid && (sessionStatusMap[sid] || sessionDocTimestampsMap[sid])) {
      const fs = sessionFinalSlotMap[sid];
      const ts = sessionDocTimestampsMap[sid];
      const startMs = sessionScheduledStartMsMap[sid];
      const stFromDoc = sessionStatusMap[sid];
      const stFromMsg = m.session?.sessionStatus;
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
          ...(typeof startMs === "number" && Number.isFinite(startMs)
            ? { scheduledStartAtMs: startMs }
            : {}),
        },
      };
    }
  }

  return m;
}

export function buildSessionMapsFromLinkedCache(
  cache: Record<string, LinkedSessionSnapshot>,
): {
  sessionStatusMap: Record<string, string>;
  sessionFinalSlotMap: Record<string, { date: string; time: string } | null>;
  sessionHasProposedSlotsMap: Record<string, boolean>;
  sessionScheduledStartMsMap: Record<string, number | null | undefined>;
  sessionDocTimestampsMap: Record<
    string,
    { createdAt?: unknown; updatedAt?: unknown }
  >;
} {
  const sessionStatusMap: Record<string, string> = {};
  const sessionFinalSlotMap: Record<
    string,
    { date: string; time: string } | null
  > = {};
  const sessionHasProposedSlotsMap: Record<string, boolean> = {};
  const sessionScheduledStartMsMap: Record<
    string,
    number | null | undefined
  > = {};
  const sessionDocTimestampsMap: Record<
    string,
    { createdAt?: unknown; updatedAt?: unknown }
  > = {};

  for (const [sid, snap] of Object.entries(cache)) {
    if (snap.status) sessionStatusMap[sid] = snap.status;
    sessionHasProposedSlotsMap[sid] = !!snap.hasProposedSlots;
    sessionDocTimestampsMap[sid] = {
      createdAt: snap.createdAt,
      updatedAt: snap.updatedAt,
    };
    sessionFinalSlotMap[sid] = snap.finalSlot ?? null;
    sessionScheduledStartMsMap[sid] =
      typeof snap.scheduledStartMs === "number" &&
      Number.isFinite(snap.scheduledStartMs)
        ? snap.scheduledStartMs
        : undefined;
  }

  return {
    sessionStatusMap,
    sessionFinalSlotMap,
    sessionHasProposedSlotsMap,
    sessionScheduledStartMsMap,
    sessionDocTimestampsMap,
  };
}
