import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  LogIn,
  LogOut,
  Smartphone,
  Shield,
  Send,
  Trash2,
} from "lucide-react-native";
import { AURORA } from "../../constants/aurora-colors";
import type { AuditEntry } from "../../types/audit.types";

/** Do not show raw Firestore IDs for these targets in the subtitle. */
function hideTechnicalTarget(entry: AuditEntry): boolean {
  const t = (entry.targetType ?? "").toLowerCase();
  return (
    t === "chat" ||
    t === "conversation" ||
    t === "conversation_message" ||
    t.startsWith("conversation")
  );
}

function metaString(entry: AuditEntry): string {
  const m = entry.metadata as Record<string, unknown> | undefined;
  if (!m) return "";
  const name =
    (typeof m.displayName === "string" && m.displayName) ||
    (typeof m.counselorName === "string" && m.counselorName) ||
    "";
  const email = typeof m.email === "string" ? m.email : "";
  const bits = [name, email].filter(Boolean);
  return bits.join(" · ");
}

function humanizeMessageType(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const t = raw.toLowerCase().replace(/-/g, "_");
  const map: Record<string, string> = {
    text: "Text message",
    session: "Session / booking card",
    invite: "Session invite",
    session_request: "Session request",
    system: "System message",
  };
  return map[t] ?? raw.replace(/_/g, " ");
}

const ACTION_TITLE: Record<string, string> = {
  message_sent: "Message sent",
  delete_chat_message: "Delete chat message",
  counselor_approve: "Counselor approved",
  counselor_reject: "Counselor rejected",
};

function humanizeAction(action: string): string {
  if (ACTION_TITLE[action]) return ACTION_TITLE[action];
  return action
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function describe(entry: AuditEntry): {
  title: string;
  subtitle: string;
  kind: "login" | "logout" | "app" | "message" | "delete_msg" | "admin";
} {
  const role = entry.performedByRole ?? "user";
  const meta = metaString(entry);
  const m = entry.metadata as Record<string, unknown> | undefined;
  const msgTypeLine = humanizeMessageType(m?.messageType);

  switch (entry.action) {
    case "user_login":
      return {
        title: "Signed in",
        subtitle: meta || `${role} · ${entry.performedBy}`,
        kind: "login",
      };
    case "user_logout":
      return {
        title: "Signed out",
        subtitle: meta || `${role} · ${entry.performedBy}`,
        kind: "logout",
      };
    case "app_active":
      return {
        title: "Opened / using app",
        subtitle: meta || `${role} · ${entry.performedBy}`,
        kind: "app",
      };
    case "message_sent":
      return {
        title: "Message sent",
        subtitle: meta || (msgTypeLine || `${role} chat`),
        kind: "message",
      };
    case "delete_chat_message":
      return {
        title: "Delete chat message",
        subtitle: [meta, msgTypeLine].filter(Boolean).join(" · "),
        kind: "delete_msg",
      };
    default: {
      const parts: string[] = [];
      if (meta) parts.push(meta);
      if (msgTypeLine) parts.push(msgTypeLine);
      if (!hideTechnicalTarget(entry) && entry.targetType && entry.targetId) {
        parts.push(`${entry.targetType}: ${entry.targetId}`);
      }
      return {
        title: humanizeAction(entry.action || "event"),
        subtitle: parts.join(" · "),
        kind: "admin",
      };
    }
  }
}

export default function AuditLogItem({
  entry,
  isLast,
}: {
  entry: AuditEntry;
  isLast?: boolean;
}) {
  const { title, subtitle, kind } = describe(entry);
  const whenFull = entry.createdAt
    ? entry.createdAt.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const Icon =
    kind === "login"
      ? LogIn
      : kind === "logout"
        ? LogOut
        : kind === "app"
          ? Smartphone
          : kind === "message"
            ? Send
            : kind === "delete_msg"
              ? Trash2
              : Shield;
  const iconColor =
    kind === "login"
      ? AURORA.green
      : kind === "logout"
        ? AURORA.red
        : kind === "app"
          ? AURORA.blue
          : kind === "message"
            ? AURORA.blueLight
            : kind === "delete_msg"
              ? AURORA.orange
              : AURORA.amber;

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.dot, { borderColor: iconColor }]}>
          <Icon size={14} color={iconColor} />
        </View>
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <View style={styles.card}>
        <Text style={styles.when}>{whenFull}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.role}>
          {(entry.performedByRole ?? "user").toUpperCase()}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  rail: {
    width: 28,
    alignItems: "center",
    marginRight: 10,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: AURORA.bgDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    flex: 1,
    width: 2,
    marginTop: 4,
    minHeight: 12,
    backgroundColor: AURORA.border,
  },
  card: {
    flex: 1,
    backgroundColor: AURORA.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AURORA.border,
    marginBottom: 12,
  },
  when: {
    color: AURORA.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  title: {
    color: AURORA.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  role: {
    color: AURORA.blue,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: AURORA.textSec,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
});
