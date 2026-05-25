import { AppText as Text } from "../../src/components/common/AppText";
import { AppTextInput as TextInput } from "../../src/components/common/AppTextInput";
/**
 * Counselor Messages - messages.tsx
 * ====================================
 * Route: /(counselor)/messages
 * Shows student conversations with unread indicators.
 * Supports appointment scheduling: counselor can invite students to sessions.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable, Modal, StyleSheet, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Send,
  PenSquare,
  ChevronRight,
  CalendarPlus,
  Check,
} from "lucide-react-native";
import { useAuth } from "../../src/stores/AuthContext";
import {
  useMessagesContactStore,
  type MessageContact,
} from "../../src/stores/messagesContactStore";
import { firestoreService } from "../../src/services/firebase-firestore.service";
import { auditLogsService } from "../../src/services/audit-logs.service";
import { AURORA } from "../../src/constants/aurora-colors";
import { LetterAvatar } from "../../src/components/common/LetterAvatar";
import { router, useLocalSearchParams } from "expo-router";
import { isOpenSessionRequestExpired } from "../../src/utils/dateHelpers";
import { resolveSessionsDocIdForSessionCard } from "../../src/utils/sessionInviteIds";
import SendSessionInviteModal, {
  type SessionInviteData,
} from "../../src/components/counselor/SendSessionInviteModal";
import SessionCard, {
  type SessionCardData,
} from "../../src/components/counselor/SessionCard";
import SessionAttendanceModal, {
  type AttendanceStatus,
} from "../../src/components/counselor/SessionAttendanceModal";
import SessionRequestReceivedCard from "../../src/components/counselor/SessionRequestReceivedCard";
import SelectStudentModal from "../../src/components/counselor/SelectStudentModal";
import * as Clipboard from "expo-clipboard";
import { subscribeToUsersPresence } from "../../src/services/firebase-presence.service";
import { usePeerPresence } from "../../src/hooks/usePeerPresence";
import { auth } from "../../src/services/firebase";
import {
  InfoGuideModal,
  type InfoGuideContent,
} from "../../src/components/common/InfoGuideModal";
import { AuroraConfirmModal } from "../../src/components/common/AuroraConfirmModal";
import {
  AuroraActionSheetModal,
  type AuroraActionSheetContent,
} from "../../src/components/common/AuroraActionSheetModal";
import { buildFeedback } from "../../src/utils/aurora-feedback";
import ConversationReadOnlyBanner from "../../src/components/messages/ConversationReadOnlyBanner";

// ─── Types ─────────────────────────────────────────────────────────────────────
type FilterTab = "All Messages" | "Unread";
type Conversation = MessageContact;

interface TextChatMessage {
  id: string;
  senderId: "me" | "them";
  type: "text";
  text: string;
  time: string;
}

interface SessionChatMessage {
  id: string;
  senderId: "me" | "them";
  type: "session";
  session: SessionCardData;
  time: string;
}

interface SessionRequestChatMessage {
  id: string;
  senderId: "me" | "them";
  type: "session_request";
  sessionRequest: {
    id: string;
    sessionId: string | null;
    preferredTime: string;
    note: string;
    status: string;
    /** Message `createdAt` — used for 3-day request expiry when still unaccepted. */
    requestedAtMs?: number;
  };
  time: string;
}

type ChatMessage =
  | TextChatMessage
  | SessionChatMessage
  | SessionRequestChatMessage;

const AUTO_ACCEPTED_PREFIX = "__AUTO_ACCEPTED__";
const SESSION_ACCEPT_NOTICE_TEXT = "Just accepted your request";

function matchesSessionAcceptNoticeText(raw: string): boolean {
  const t = raw.trim().replace(/\s+/g, " ").toLowerCase();
  return t === SESSION_ACCEPT_NOTICE_TEXT.toLowerCase();
}

// ─── Conversation Row ──────────────────────────────────────────────────────────
function ConversationRow({
  item,
  onPress,
  onLongPress,
}: {
  item: Conversation;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const previewIsSessionMeta = item.preview
    ?.toLowerCase()
    .startsWith("session:");
  const isArchived = item.isArchived === true;
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      activeOpacity={0.85}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: item.isUnread
          ? "rgba(45,107,255,0.12)"
          : isArchived
            ? "rgba(148,163,184,0.08)"
            : AURORA.card,
        borderRadius: 16,
        marginBottom: 10,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: item.isUnread
          ? "rgba(45,107,255,0.45)"
          : isArchived
            ? "rgba(148,163,184,0.35)"
            : AURORA.border,
        opacity: isArchived ? 0.88 : 1,
      }}
    >
      {/* Left color border */}
      <View
        style={{ width: 0, backgroundColor: AURORA.blue, alignSelf: "stretch" }}
      />

      {/* Avatar */}
      <View style={{ position: "relative", margin: 12 }}>
        <LetterAvatar
          name={item.name}
          size={52}
          avatarUrl={item.avatar || undefined}
        />
        <View
          style={{
            position: "absolute",
            bottom: 1,
            right: 1,
            width: 13,
            height: 13,
            borderRadius: 7,
            backgroundColor: item.isOnline ? AURORA.green : AURORA.textMuted,
            borderWidth: 2,
            borderColor: AURORA.card,
          }}
        />
      </View>

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
            gap: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: item.isUnread ? "700" : "600",
              }}
            >
              {item.name}
            </Text>
            {isArchived ? (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: "rgba(148,163,184,0.2)",
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.35)",
                }}
              >
                <Text
                  style={{
                    color: AURORA.textMuted,
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 0.3,
                  }}
                >
                  ARCHIVED
                </Text>
              </View>
            ) : null}
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: item.isUnread ? AURORA.blue : AURORA.textSec,
                fontWeight: item.isUnread ? "700" : "400",
              }}
            >
              {item.time}
            </Text>
            {item.isUnread ? (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: AURORA.blue,
                }}
              />
            ) : null}
          </View>
        </View>
        <Text
          numberOfLines={1}
          style={{
            color: previewIsSessionMeta ? "#AFC0E8" : AURORA.textSec,
            fontSize: previewIsSessionMeta ? 12 : 13,
            fontWeight: previewIsSessionMeta ? "500" : "400",
          }}
        >
          {item.preview}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Chat View ─────────────────────────────────────────────────────────────────
function ChatView({
  contact,
  onBack,
  onThreadRepaired,
}: {
  contact: Conversation;
  onBack: () => void;
  onThreadRepaired?: () => void;
}) {
  const { user } = useAuth();
  const peerOnline = usePeerPresence(contact.id);
  const [readOnly, setReadOnly] = useState(
    contact.messagingClosed === true || contact.isPastCollege === true,
  );
  const conversationId =
    contact.conversationId || (user?.id ? `${user.id}_${contact.id}` : "");
  const [message, setMessage] = useState("");
  /** Mirrors the composer so Send uses the latest text (avoids Android RN lag vs `message` state). */
  const messageDraftRef = useRef("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [
    showInviteModalForSessionRequest,
    setShowInviteModalForSessionRequest,
  ] = useState<string | null>(null);
  const [initialRescheduleData, setInitialRescheduleData] = useState<
    Partial<SessionInviteData> | undefined
  >(undefined);
  const [proposeModalSource, setProposeModalSource] = useState<
    "student_request" | "reschedule" | null
  >(null);
  /** When opening propose-times after "Needs rescheduling" on a session card — drives chat lead copy. */
  const [attendanceRescheduleSlot, setAttendanceRescheduleSlot] = useState<{
    date: string;
    time: string;
  } | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedSessionForAttendance, setSelectedSessionForAttendance] =
    useState<SessionCardData | null>(null);
  const [expandedSessionRequestNotes, setExpandedSessionRequestNotes] =
    useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<InfoGuideContent | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    messageId: string;
    messageType: string;
  } | null>(null);
  const [messageOptionsSheet, setMessageOptionsSheet] =
    useState<AuroraActionSheetContent | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  /** One-shot scroll after switching threads; cleared after first successful scroll. */
  const pendingScrollToEndRef = useRef(false);

  const scrollChatToEnd = useCallback(() => {
    const scroller = scrollViewRef.current;
    if (!scroller) return;
    const animated = Platform.OS === "ios";
    requestAnimationFrame(() => {
      scroller.scrollToEnd({ animated });
      if (Platform.OS === "android") {
        requestAnimationFrame(() => {
          scroller.scrollToEnd({ animated: false });
        });
      }
    });
  }, []);

  useEffect(() => {
    messageDraftRef.current = "";
    setMessage("");
    pendingScrollToEndRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    setReadOnly(
      contact.messagingClosed === true || contact.isPastCollege === true,
    );
  }, [contact.messagingClosed, contact.isPastCollege, conversationId]);

  useEffect(() => {
    if (!conversationId || !user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const repaired =
          await firestoreService.repairConversationCollegeTagIfAligned(
            conversationId,
            user.id,
          );
        const state = await firestoreService.getConversationMessagingState(
          conversationId,
          user.id,
        );
        if (cancelled) return;
        setReadOnly(state.messagingClosed);
        if (repaired || !state.messagingClosed) {
          onThreadRepaired?.();
        }
      } catch {
        // Keep list-derived read-only default.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, user?.id, onThreadRepaired]);

  useEffect(() => {
    if (!conversationId || !user?.id) {
      setLoadingMessages(false);
      return;
    }
    setLoadingMessages(true);
    const unsub = firestoreService.subscribeConversationMessages(
      conversationId,
      user.id,
      (msgs) => {
        setMessages(msgs as ChatMessage[]);
        setLoadingMessages(false);
      },
      (err) => {
        console.error("Failed to load conversation messages:", err);
        setMessages([]);
        setLoadingMessages(false);
      },
    );
    return unsub;
  }, [conversationId, user?.id]);

  // Mark conversation as read as soon as counselor opens it (active inbox only).
  useEffect(() => {
    if (!conversationId || !user?.id || readOnly) return;
    firestoreService
      .markConversationAsRead(conversationId, user.id)
      .catch(() => {});
  }, [conversationId, user?.id, readOnly]);

  // Scroll once messages are loaded (Android: fixed delay is often too early vs layout).
  useEffect(() => {
    if (loadingMessages || messages.length === 0) return;
    if (!pendingScrollToEndRef.current) return;
    const t = setTimeout(() => {
      if (!pendingScrollToEndRef.current) return;
      scrollChatToEnd();
      pendingScrollToEndRef.current = false;
    }, 120);
    return () => clearTimeout(t);
  }, [loadingMessages, messages.length, conversationId, scrollChatToEnd]);

  useEffect(() => {
    if (!loadingMessages && messages.length === 0) {
      pendingScrollToEndRef.current = false;
    }
  }, [loadingMessages, messages.length]);

  const sendMessage = async () => {
    if (readOnly) return;
    const text = messageDraftRef.current.trim();
    if (!text || !user?.id || !conversationId || sending) return;
    setSending(true);
    try {
      await firestoreService.sendTextMessage(conversationId, user.id, text);
      void auditLogsService.write({
        performedBy: user.id,
        performedByRole: user.role,
        action: "message_sent",
        targetType: "chat",
        targetId: user.id,
        metadata: { messageType: "text" },
      });
      messageDraftRef.current = "";
      setMessage("");
      setTimeout(scrollChatToEnd, Platform.OS === "android" ? 80 : 50);
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  };

  const handleSendSessionInvite = async (data: SessionInviteData) => {
    if (!user?.id || !conversationId || sending) return;
    const formatSlot = (d: Date) => ({
      date: d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      time: d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    });
    const timeSlots = [
      data.primaryDate && formatSlot(data.primaryDate),
      data.alternativeDate && formatSlot(data.alternativeDate),
      data.finalDate && formatSlot(data.finalDate),
    ].filter(Boolean) as { date: string; time: string }[];
    if (timeSlots.length === 0) return;
    const headline = timeSlots[0];
    setSending(true);
    try {
      const sessionId = await firestoreService.createCounselorSessionInvite(
        user.id,
        contact.id,
        timeSlots,
        { note: data.note },
      );
      const sessionData: SessionCardData & {
        note?: string;
        timeSlots?: { date: string; time: string }[];
      } = {
        id: sessionId,
        type: "invite",
        title: "Academic Guidance",
        counselorName: user.full_name || "Counselor",
        date: headline.date,
        time: headline.time,
        location: "Office of Guidance and Counseling (OGC)",
        note: data.note,
        timeSlots,
      };
      await firestoreService.sendSessionMessage(
        conversationId,
        user.id,
        { ...sessionData } as Record<string, unknown>,
      );
    } catch (e) {
      console.error("Failed to send session invite:", e);
    } finally {
      setSending(false);
    }
  };

  const handlePlusPress = () => {
    if (readOnly) return;
    setShowInviteModal(true);
  };

  const parsePreferredTimeToSlot = (
    preferredTime: string,
  ): { date: string; time: string } => {
    const normalized = preferredTime.replace(/\s+at\s+/i, ", ");
    const parts = normalized.split(", ");
    if (parts.length < 2) return { date: preferredTime, time: "" };
    const time = parts[parts.length - 1];
    const date = parts.slice(0, -1).join(", ");
    return { date, time };
  };

  const handleAcceptSessionRequest = async (
    sessionId: string | null,
    preferredTime: string,
    meta?: { requestedAtMs?: number; status?: string },
  ) => {
    if (!sessionId || !preferredTime || sending || !conversationId || !user?.id)
      return;
    if (
      isOpenSessionRequestExpired({
        status: meta?.status ?? "requested",
        preferredTime,
        requestedAtMs: meta?.requestedAtMs,
      })
    ) {
      setFeedback(
        buildFeedback(
          "Expired request",
          "This session request can no longer be accepted because 24 hours have passed without a response, or the preferred time has already passed.",
          "warning",
        ),
      );
      return;
    }
    setSending(true);
    try {
      const slot = parsePreferredTimeToSlot(preferredTime);
      await firestoreService.acceptStudentSessionRequest(
        conversationId,
        sessionId,
        slot,
        user.id,
      );
      await firestoreService.sendTextMessage(
        conversationId,
        user.id,
        `${AUTO_ACCEPTED_PREFIX}Your session is scheduled for ${slot.date} at ${slot.time}.`,
      );
    } catch (e) {
      console.error("Failed to accept session request:", e);
      setFeedback(
        buildFeedback(
          "Could not accept request",
          e instanceof Error
            ? e.message
            : "Something went wrong. Please try again.",
          "error",
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const handleProposeNewTime = (
    sessionId: string | null,
    preferredTime?: string,
  ) => {
    if (sessionId) {
      setProposeModalSource("student_request");
      const preferredSeed = preferredTime
        ? parseSlotToDate(parsePreferredTimeToSlot(preferredTime))
        : null;
      setInitialRescheduleData(
        preferredSeed
          ? {
              primaryDate: preferredSeed,
            }
          : undefined,
      );
      setAttendanceRescheduleSlot(null);
      setShowInviteModalForSessionRequest(sessionId);
    }
  };

  const parseSlotToDate = (slot?: { date?: string; time?: string } | null) => {
    if (!slot?.date || !slot?.time) return null;
    const parsed = new Date(`${slot.date} ${slot.time}`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const handleProposeSlotsFromModal = async (
    data: SessionInviteData,
    sessionId: string,
  ) => {
    if (!sessionId || !user?.id || !conversationId || sending) return;
    const formatSlot = (d: Date | null) =>
      d
        ? {
            date: d.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
            time: d.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          }
        : null;
    const slots = [
      data.primaryDate && formatSlot(data.primaryDate),
      data.alternativeDate && formatSlot(data.alternativeDate),
      data.finalDate && formatSlot(data.finalDate),
    ].filter(Boolean) as { date: string; time: string }[];
    if (slots.length === 0) return;
    const primary = data.primaryDate!;
    const fromAttendance = attendanceRescheduleSlot;
    const isRescheduleFlow = proposeModalSource === "reschedule";
    const isStudentRequestFlow = proposeModalSource === "student_request";
    setSending(true);
    try {
      if (isStudentRequestFlow) {
        const firstName = contact.name.split(" ")[0] || "there";
        const lead = `Hi ${firstName}, here are some schedules that work on my side. Please tap the session card below and choose one that fits you.`;
        await firestoreService.sendTextMessage(conversationId, user.id, lead);
      }
      await firestoreService.proposeSlots(sessionId, slots, {
        proposalKind: isRescheduleFlow || !!fromAttendance
          ? "attendance_reschedule"
          : "counselor_new_times",
        actorId: user.id,
      });
      const sessionData: SessionCardData & {
        note?: string;
        timeSlots?: { date: string; time: string }[];
      } = {
        id: sessionId,
        type: "invite",
        title: "Choose a new time",
        counselorName: user.full_name || "Counselor",
        date: primary.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        time: primary.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        location: "Office of Guidance and Counseling (OGC)",
        note: data.note.trim(),
        timeSlots: slots,
      };
      await firestoreService.updateSessionInviteMessageScheduleForSession(
        conversationId,
        user.id,
        sessionId,
        { ...sessionData } as Record<string, unknown>,
      );
      setShowInviteModalForSessionRequest(null);
    } catch (e) {
      console.error("Failed to propose slots:", e);
    } finally {
      setSending(false);
      setAttendanceRescheduleSlot(null);
      setInitialRescheduleData(undefined);
      setProposeModalSource(null);
    }
  };

  const mapAttendanceToStatus = (
    s: AttendanceStatus,
  ): "completed" | "missed" | "rescheduled" => {
    if (s === "showed_up") return "completed";
    if (s === "did_not_show") return "missed";
    return "rescheduled";
  };

  const handleMarkAttendance = async (status: AttendanceStatus) => {
    if (status === "needs_rescheduling") {
      const sessionId = selectedSessionForAttendance?.id;
      const att = selectedSessionForAttendance;
      setShowAttendanceModal(false);
      setSelectedSessionForAttendance(null);
      if (sessionId && !sessionId.startsWith("session_")) {
        const parsed =
          parseSlotToDate(att ? { date: att.date, time: att.time } : null) ??
          null;
        setInitialRescheduleData(
          parsed
            ? {
                primaryDate: parsed,
              }
            : undefined,
        );
        if (att?.date?.trim() && att?.time?.trim()) {
          setProposeModalSource("reschedule");
          setAttendanceRescheduleSlot({
            date: att.date.trim(),
            time: att.time.trim(),
          });
        } else {
          setProposeModalSource("reschedule");
          setAttendanceRescheduleSlot(null);
        }
        setShowInviteModalForSessionRequest(sessionId);
      }
      return;
    }
    const sessionId = selectedSessionForAttendance?.id;
    if (sessionId && !sessionId.startsWith("session_")) {
      try {
        await firestoreService.markSessionAttendance(
          sessionId,
          mapAttendanceToStatus(status),
          undefined,
          user?.id,
        );
      } catch (e) {
        console.error("Failed to mark attendance:", e);
        const message =
          e instanceof Error && e.message.trim()
            ? e.message
            : "Could not mark attendance. Please try again.";
        Alert.alert("Could not mark attendance", message);
      }
    }
    setShowAttendanceModal(false);
    setSelectedSessionForAttendance(null);
  };

  const handleCopyText = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
    } catch (e) {
      console.error("Failed to copy text:", e);
    }
  };

  const confirmDeleteMessage = (messageId: string, messageType: string) => {
    if (!user?.id || readOnly) return;
    setPendingDelete({ messageId, messageType });
  };

  const isLikelyDateLabel = (value: string) =>
    /^[A-Za-z]{3,9}\s+\d{1,2}(,\s*\d{4})?$/.test(value.trim()) ||
    /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(value.trim());

  const shortenNote = (text: string, max = 90) =>
    text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: AURORA.bgMessages }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <SafeAreaView
          style={{ flex: 1 }}
          edges={
            Platform.OS === "android"
              ? (["top", "left", "bottom"] as const)
              : undefined
          }
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: AURORA.border,
            }}
          >
            <TouchableOpacity
              onPress={onBack}
              style={{ width: 30, alignItems: "flex-start", padding: 4 }}
            >
              <ArrowLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}
              >
                {contact.name}
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: peerOnline
                      ? AURORA.green
                      : AURORA.textMuted,
                  }}
                />
                <Text
                  style={{
                    color: peerOnline ? AURORA.green : AURORA.textMuted,
                    fontSize: 12,
                  }}
                >
                  {peerOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </View>
            <View style={{ width: 30 }} />
            {/* <TouchableOpacity style={{ padding: 4 }}>
                        <Info size={22} color={AURORA.textSec} />
                    </TouchableOpacity> */}
          </View>

          {/* Privacy Banner */}
          {/* <View
            style={{
              backgroundColor: "rgba(124,58,237,0.12)",
              borderWidth: 1,
              borderColor: "rgba(124,58,237,0.25)",
              borderRadius: 12,
              marginHorizontal: 16,
              marginTop: 12,
              paddingVertical: 7,
              paddingHorizontal: 12,
            }}
          >
            <Text
              style={{
                color: AURORA.purple,
                fontSize: 10,
                fontWeight: "700",
                textAlign: "center",
                letterSpacing: 0.45,
              }}
            >
              COUNSELOR — STUDENT PRIVATE CONVERSATION
            </Text>
          </View> */}

          {readOnly ? <ConversationReadOnlyBanner role="counselor" /> : null}

          {/* Messages */}
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                ...(Platform.OS === "android"
                  ? { paddingLeft: 14, paddingRight: 6 }
                  : { paddingHorizontal: 16 }),
                paddingVertical: 16,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onContentSizeChange={() => {
                if (loadingMessages || messages.length === 0) return;
                if (!pendingScrollToEndRef.current) return;
                scrollChatToEnd();
                pendingScrollToEndRef.current = false;
              }}
            >
              {loadingMessages ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={AURORA.blue} />
                </View>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.senderId === "me";
                  // Counselor should always show student session requests on the left (student perspective).
                  const isSessionRequest = msg.type === "session_request";
                  const isMeForLayout = isSessionRequest ? false : isMe;
                  const senderLabel = isMeForLayout ? "You" : contact.name;

                  const rawText = msg.type === "text" ? msg.text : "";
                  const hasAcceptMarker =
                    rawText.startsWith(AUTO_ACCEPTED_PREFIX);
                  const acceptBodyForMatch = hasAcceptMarker
                    ? rawText.slice(AUTO_ACCEPTED_PREFIX.length).trim()
                    : rawText.trim();
                  const isAutoAccepted =
                    msg.type === "text" &&
                    (hasAcceptMarker ||
                      matchesSessionAcceptNoticeText(rawText));
                  const isDeletedPlaceholder =
                    msg.type === "text" && rawText.startsWith("[Deleted");
                  const displayText =
                    msg.type === "text"
                      ? hasAcceptMarker
                        ? rawText.slice(AUTO_ACCEPTED_PREFIX.length).trim()
                        : rawText
                      : "";
                  const acceptNoticeBubbleText =
                    isAutoAccepted &&
                    matchesSessionAcceptNoticeText(acceptBodyForMatch)
                      ? SESSION_ACCEPT_NOTICE_TEXT
                      : acceptBodyForMatch;

                  const canDeleteText = isMe;
                  const canCopyText =
                    msg.type === "text"
                      ? !msg.text.startsWith("[Deleted")
                      : true;
                  const isDateStamp = isLikelyDateLabel(msg.time);
                  const prevTime = idx > 0 ? messages[idx - 1].time : null;
                  const showDateSeparator =
                    isDateStamp && prevTime !== msg.time;

                  const messageContent =
                    msg.type === "text" ? (
                      <Pressable
                        onLongPress={() => {
                          if (!user?.id) return;
                          const actions: AuroraActionSheetContent["actions"] =
                            [];
                          if (canCopyText) {
                            actions.push({
                              label: "Copy",
                              onPress: () => {
                                void (async () => {
                                  await handleCopyText(displayText);
                                  setFeedback(
                                    buildFeedback(
                                      "Copied",
                                      "Message copied to clipboard.",
                                      "success",
                                    ),
                                  );
                                })();
                              },
                            });
                          }
                          if (canDeleteText) {
                            actions.push({
                              label: "Delete",
                              destructive: true,
                              onPress: () =>
                                confirmDeleteMessage(msg.id, "text"),
                            });
                          }
                          if (actions.length === 0) return;
                          setMessageOptionsSheet({
                            title: "Message options",
                            actions,
                          });
                        }}
                      >
                        <View
                          collapsable={false}
                          style={{
                            minWidth: 80,
                            maxWidth: "100%",
                            alignSelf: isMeForLayout
                              ? "flex-end"
                              : "flex-start",
                            overflow:
                              Platform.OS === "android" ? "visible" : undefined,
                            backgroundColor: isMeForLayout
                              ? AURORA.blue
                              : AURORA.card,
                            borderRadius: 18,
                            borderBottomLeftRadius: isMeForLayout ? 18 : 4,
                            borderBottomRightRadius: isMeForLayout ? 4 : 18,
                            paddingHorizontal:
                              Platform.OS === "android" ? 10 : 12,
                            paddingTop: isAutoAccepted ? 10 : 12,
                            paddingBottom: isAutoAccepted
                              ? 10
                              : Platform.OS === "android"
                                ? 14
                                : 12,
                          }}
                        >
                          {isAutoAccepted ? (
                            <>
                              <Text
                                style={{
                                  color: AURORA.green,
                                  fontSize: 14,
                                  lineHeight: 20,
                                  flexShrink: 1,
                                  ...(Platform.OS === "android"
                                    ? ({ includeFontPadding: false } as const)
                                    : null),
                                }}
                              >
                                {acceptNoticeBubbleText}
                              </Text>
                              <Text
                                style={{
                                  color: "rgba(255,255,255,0.7)",
                                  fontSize: 11,
                                  marginTop: 4,
                                  textAlign: "right",
                                }}
                              >
                                {msg.time}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text
                                style={{
                                  color: isDeletedPlaceholder
                                    ? AURORA.textMuted
                                    : "#FFFFFF",
                                  fontSize: 14,
                                  lineHeight:
                                    Platform.OS === "android" ? 22 : 20,
                                  ...(Platform.OS === "android"
                                    ? ({
                                        includeFontPadding: false,
                                        alignSelf: "stretch",
                                      } as const)
                                    : null),
                                }}
                              >
                                {displayText}
                              </Text>
                              <Text
                                style={{
                                  color: "rgba(255,255,255,0.7)",
                                  fontSize: 11,
                                  marginTop: 6,
                                  textAlign: "right",
                                }}
                              >
                                {msg.time}
                              </Text>
                            </>
                          )}
                        </View>
                      </Pressable>
                    ) : msg.type === "session_request" ? (
                      <View>
                        {(() => {
                          const note = msg.sessionRequest.note || "";
                          const expanded =
                            !!expandedSessionRequestNotes[msg.id];
                          const noteForCard = expanded
                            ? note
                            : shortenNote(note);
                          const requestExpired = isOpenSessionRequestExpired({
                            status: msg.sessionRequest.status,
                            preferredTime: msg.sessionRequest.preferredTime,
                            requestedAtMs: msg.sessionRequest.requestedAtMs,
                          });
                          return (
                            <>
                              <SessionRequestReceivedCard
                                isFromMe={false}
                                data={{
                                  sessionId: msg.sessionRequest.sessionId ?? "",
                                  title: "Session Request",
                                  preferredTime:
                                    msg.sessionRequest.preferredTime ||
                                    undefined,
                                  note: noteForCard,
                                  status: msg.sessionRequest.status,
                                  isExpired: requestExpired,
                                }}
                                onAccept={
                                  !readOnly &&
                                  msg.sessionRequest.sessionId &&
                                  msg.sessionRequest.preferredTime &&
                                  !requestExpired
                                    ? () =>
                                        handleAcceptSessionRequest(
                                          msg.sessionRequest.sessionId!,
                                          msg.sessionRequest.preferredTime,
                                          {
                                            requestedAtMs:
                                              msg.sessionRequest.requestedAtMs,
                                            status: msg.sessionRequest.status,
                                          },
                                        )
                                    : undefined
                                }
                                onProposeNewTime={
                                  !readOnly &&
                                  msg.sessionRequest.sessionId &&
                                  !requestExpired
                                    ? () =>
                                        handleProposeNewTime(
                                          msg.sessionRequest.sessionId,
                                          msg.sessionRequest.preferredTime,
                                        )
                                    : undefined
                                }
                              />
                              {note.length > 90 ? (
                                <TouchableOpacity
                                  onPress={() =>
                                    setExpandedSessionRequestNotes((prev) => ({
                                      ...prev,
                                      [msg.id]: !prev[msg.id],
                                    }))
                                  }
                                  style={{
                                    alignSelf: "flex-start",
                                    marginTop: 6,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: AURORA.blue,
                                      fontSize: 11,
                                      fontWeight: "700",
                                    }}
                                  >
                                    {expanded ? "Hide note" : "Show note"}
                                  </Text>
                                </TouchableOpacity>
                              ) : null}
                            </>
                          );
                        })()}
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.6)",
                            fontSize: 11,
                            marginTop: 6,
                            textAlign: "left",
                          }}
                        >
                          {!isDateStamp ? msg.time : ""}
                        </Text>
                      </View>
                    ) : msg.type === "session" ? (
                      <Pressable
                        onLongPress={() => {
                          // Session cards: delete only (no copy) and only for messages you sent.
                          if (!isMe) return;
                          confirmDeleteMessage(msg.id, "session");
                        }}
                      >
                        <View>
                          <SessionCard
                            data={msg.session}
                            isFromMe={isMe}
                            onMarkAttendance={
                              readOnly
                                ? undefined
                                : () => {
                                    setSelectedSessionForAttendance(msg.session);
                                    setShowAttendanceModal(true);
                                  }
                            }
                            onReschedule={(() => {
                              if (readOnly) return undefined;
                              const sid = resolveSessionsDocIdForSessionCard(
                                msg.session,
                              );
                              return sid
                                ? () => {
                                    const slotDates = (
                                      msg.session.timeSlots || []
                                    )
                                      .map((slot) => parseSlotToDate(slot))
                                      .filter(Boolean) as Date[];
                                    const primaryFallback = parseSlotToDate({
                                      date: msg.session.date,
                                      time: msg.session.time,
                                    });
                                    setInitialRescheduleData({
                                      primaryDate:
                                        slotDates[0] ?? primaryFallback ?? null,
                                      alternativeDate: slotDates[1] ?? null,
                                      finalDate: slotDates[2] ?? null,
                                    });
                                    setShowInviteModal(false);
                                    setProposeModalSource("reschedule");
                                    setAttendanceRescheduleSlot(null);
                                    setShowInviteModalForSessionRequest(sid);
                                  }
                                : undefined;
                            })()}
                          />
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.6)",
                              fontSize: 11,
                              marginTop: 6,
                              textAlign: isMeForLayout ? "right" : "left",
                            }}
                          >
                            {!isDateStamp ? msg.time : ""}
                          </Text>
                        </View>
                      </Pressable>
                    ) : (
                      <View
                        collapsable={false}
                        style={{
                          minWidth: 80,
                          maxWidth: 340,
                          alignSelf: isMeForLayout
                            ? "flex-end"
                            : "flex-start",
                          overflow:
                            Platform.OS === "android" ? "visible" : undefined,
                          backgroundColor: isMeForLayout
                            ? AURORA.blue
                            : AURORA.card,
                          borderRadius: 18,
                          borderBottomLeftRadius: isMeForLayout ? 18 : 4,
                          borderBottomRightRadius: isMeForLayout ? 4 : 18,
                          paddingHorizontal:
                            Platform.OS === "android" ? 10 : 12,
                          paddingTop: 12,
                          paddingBottom:
                            Platform.OS === "android"
                              ? 22
                              : 12,
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 13,
                            lineHeight: Platform.OS === "android" ? 22 : 20,
                            ...(Platform.OS === "android"
                              ? ({
                                  includeFontPadding: false,
                                  alignSelf: "stretch",
                                } as const)
                              : null),
                          }}
                        >
                          {String((msg as Record<string, unknown>)?.text ??
                            (msg as Record<string, unknown>)?.content ??
                            `[Unsupported message type: ${String((msg as Record<string, unknown>)?.type ?? "unknown")}]`)}
                        </Text>
                      </View>
                    );

                  return (
                    <View key={msg.id} style={{ marginBottom: 18 }}>
                      {showDateSeparator ? (
                        <Text
                          style={{
                            color: AURORA.textMuted,
                            fontSize: 12,
                            fontWeight: "600",
                            textAlign: "center",
                            marginBottom: 8,
                          }}
                        >
                          {msg.time}
                        </Text>
                      ) : null}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: isMeForLayout
                            ? "flex-end"
                            : "flex-start",
                          alignItems: "flex-end",
                          gap: Platform.OS === "android" ? 6 : 8,
                        }}
                      >
                        {!isMeForLayout && (
                          <LetterAvatar
                            name={contact.name}
                            size={34}
                            avatarUrl={contact.avatar || undefined}
                          />
                        )}

                        <View
                          style={{
                            flex: 1,
                            minWidth: 0,
                            maxWidth:
                              Platform.OS === "android" ? "92%" : "78%",
                            alignItems: isMeForLayout
                              ? "flex-end"
                              : "flex-start",
                          }}
                        >
                          <Text
                            style={{
                              color: AURORA.textSec,
                              fontSize: 11,
                              marginBottom: 4,
                              textAlign: isMeForLayout ? "right" : "left",
                              alignSelf: "stretch",
                            }}
                          >
                            {senderLabel}
                          </Text>
                          {messageContent}
                        </View>

                        {/* {isMeForLayout && (
                          <LetterAvatar
                            name={user?.full_name ?? "You"}
                            size={34}
                            avatarUrl={user?.avatar_url}
                          />
                        )} */}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
            <LinearGradient
              pointerEvents="none"
              colors={[AURORA.bgMessages, "rgba(8,12,48,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 18,
              }}
            />
          </View>

          {readOnly ? (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: AURORA.border,
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  color: AURORA.textMuted,
                  fontSize: 13,
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                Messaging is closed for this conversation.
              </Text>
            </View>
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: AURORA.border,
                  gap: 10,
                }}
              >
                <TouchableOpacity
                  onPress={handlePlusPress}
                  style={{
                    width: 40,
                    height: 40,
                    marginBottom: 40,
                    borderRadius: 20,
                    backgroundColor: AURORA.card,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: AURORA.border,
                  }}
                >
                  <CalendarPlus size={18} color={AURORA.textSec} />
                </TouchableOpacity>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: AURORA.card,
                    borderRadius: 24,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    marginBottom: 40,
                    color: "#FFFFFF",
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: AURORA.border,
                  }}
                  placeholder="Type a message..."
                  placeholderTextColor={AURORA.textMuted}
                  value={message}
                  onChangeText={(t) => {
                    messageDraftRef.current = t;
                    setMessage(t);
                  }}
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={sending}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: AURORA.blue,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 40,
                  }}
                >
                  <Send size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Text
                style={{
                  color: AURORA.textMuted,
                  fontSize: 11,
                  textAlign: "center",
                  marginBottom: 8,
                  paddingHorizontal: 16,
                }}
              >
                {/* Messages are encrypted and shared only with this student. */}
              </Text>
            </>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Send Session Invite Modal (from + button) */}
      <SendSessionInviteModal
        visible={showInviteModal}
        student={{
          id: contact.id,
          name: contact.name,
          avatar: contact.avatar,
          program: contact.program,
        }}
        counselorName={user?.full_name}
        onClose={() => setShowInviteModal(false)}
        onSend={handleSendSessionInvite}
      />

      {/* Propose New Time Modal (from session request card) */}
      {showInviteModalForSessionRequest && (
        <SendSessionInviteModal
          visible={!!showInviteModalForSessionRequest}
          mode="reschedule"
          student={{
            id: contact.id,
            name: contact.name,
            avatar: contact.avatar,
            program: contact.program,
          }}
          counselorName={user?.full_name}
          initialData={initialRescheduleData}
          onClose={() => {
            setShowInviteModalForSessionRequest(null);
            setAttendanceRescheduleSlot(null);
            setInitialRescheduleData(undefined);
            setProposeModalSource(null);
          }}
          onSend={(data) =>
            handleProposeSlotsFromModal(data, showInviteModalForSessionRequest!)
          }
        />
      )}

      {/* Session Attendance Modal (post-session verification) */}
      {selectedSessionForAttendance && (
        <SessionAttendanceModal
          visible={showAttendanceModal}
          student={{
            id: contact.id,
            name: contact.name,
            avatar: contact.avatar,
          }}
          session={{
            date: selectedSessionForAttendance.date,
            timeRange: selectedSessionForAttendance.time,
          }}
          onClose={() => {
            setShowAttendanceModal(false);
            setSelectedSessionForAttendance(null);
          }}
          onMarkLater={() => {
            setShowAttendanceModal(false);
            setSelectedSessionForAttendance(null);
          }}
          onMarkStatus={handleMarkAttendance}
        />
      )}

      <InfoGuideModal
        guide={feedback}
        onClose={() => setFeedback(null)}
      />
      <AuroraConfirmModal
        visible={!!pendingDelete}
        title="Delete message"
        body="Are you sure you want to delete this message?"
        cancelLabel="Cancel"
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete || !user?.id) return;
          void (async () => {
            const { messageId, messageType } = pendingDelete;
            setPendingDelete(null);
            await firestoreService.deleteConversationMessage(
              conversationId,
              messageId,
              user.id,
            );
            await auditLogsService.write({
              performedBy: user.id,
              performedByRole: user.role,
              action: "delete_chat_message",
              targetType: "chat",
              targetId: user.id,
              metadata: { messageType },
            });
          })();
        }}
      />
      <AuroraActionSheetModal
        sheet={messageOptionsSheet}
        onClose={() => setMessageOptionsSheet(null)}
      />
    </>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function CounselorMessagesScreen() {
  const { user } = useAuth();
  const currentUserId = user?.id || auth.currentUser?.uid || null;
  const { contacts, setContacts } = useMessagesContactStore();
  const [activeTab, setActiveTab] = useState<FilterTab>("All Messages");
  const [selectedContact, setSelectedContact] = useState<Conversation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const studentId =
    params.studentId == null || params.studentId === ""
      ? undefined
      : Array.isArray(params.studentId)
        ? params.studentId[0]
        : params.studentId;
  const [autoOpenLocked, setAutoOpenLocked] = useState(false);
  const [onlineByStudentId, setOnlineByStudentId] = useState<
    Record<string, boolean>
  >({});
  const [listFeedback, setListFeedback] = useState<InfoGuideContent | null>(
    null,
  );
  const [archiveModalContact, setArchiveModalContact] =
    useState<Conversation | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [showArchivedConversations, setShowArchivedConversations] =
    useState(false);
  const [showPastCollegeConversations, setShowPastCollegeConversations] =
    useState(false);
  const [pastContacts, setPastContacts] = useState<Conversation[]>([]);

  useEffect(() => {
    const ids = [...contacts, ...pastContacts].map((c) => c.id);
    if (ids.length === 0) {
      setOnlineByStudentId({});
      return;
    }
    return subscribeToUsersPresence(ids, setOnlineByStudentId);
  }, [contacts, pastContacts]);

  const contactsWithPresence = useMemo(
    () =>
      contacts.map((c) => ({
        ...c,
        isOnline: onlineByStudentId[c.id] ?? false,
      })),
    [contacts, onlineByStudentId],
  );

  const pastContactsWithPresence = useMemo(
    () =>
      pastContacts.map((c) => ({
        ...c,
        isOnline: onlineByStudentId[c.id] ?? false,
      })),
    [pastContacts, onlineByStudentId],
  );

  const listContacts = showPastCollegeConversations
    ? pastContactsWithPresence
    : contactsWithPresence;

  useEffect(() => {
    // Reset when navigating to a different student thread.
    setAutoOpenLocked(false);
  }, [studentId]);

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    // Deep link / invite-from-profile: inbox must refetch so archived→visible and
    // newly-created threads appear (zustand can be stale if this screen stayed mounted).
    if (studentId) setLoading(true);
    Promise.all([
      firestoreService.getConversations(currentUserId, {
        activeCollegeCode: user?.college_code,
        includeArchived: showArchivedConversations,
        inboxScope: "active",
      }),
      firestoreService.getConversations(currentUserId, {
        activeCollegeCode: user?.college_code,
        includeArchived: showArchivedConversations,
        inboxScope: "past",
      }),
    ])
      .then(([active, past]) => {
        if (!cancelled) {
          setContacts(active);
          setPastContacts(past);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContacts([]);
          setPastContacts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    currentUserId,
    setContacts,
    studentId,
    user?.college_code,
    showArchivedConversations,
  ]);

  useEffect(() => {
    if (loading) return;
    if (!studentId) return;
    if (autoOpenLocked) return;
    if (selectedContact) return;
    const found =
      contactsWithPresence.find(
        (c) => c.id === studentId || c.studentId === studentId,
      ) ??
      pastContactsWithPresence.find(
        (c) => c.id === studentId || c.studentId === studentId,
      );
    if (found) {
      setSelectedContact(found);
      setAutoOpenLocked(true); // prevent immediate re-opening after user presses back
    }
  }, [
    loading,
    studentId,
    contactsWithPresence,
    pastContactsWithPresence,
    selectedContact,
    autoOpenLocked,
  ]);

  const refreshConversations = useCallback(() => {
    if (!currentUserId) return;
    Promise.all([
      firestoreService.getConversations(currentUserId, {
        activeCollegeCode: user?.college_code,
        includeArchived: showArchivedConversations,
        inboxScope: "active",
      }),
      firestoreService.getConversations(currentUserId, {
        activeCollegeCode: user?.college_code,
        includeArchived: showArchivedConversations,
        inboxScope: "past",
      }),
    ])
      .then(([active, past]) => {
        setContacts(active);
        setPastContacts(past);
      })
      .catch(() => {
        setContacts([]);
        setPastContacts([]);
      });
  }, [
    currentUserId,
    setContacts,
    user?.college_code,
    showArchivedConversations,
  ]);

  const handleConversationCreated = async (studentId: string) => {
    if (!currentUserId) return;
    try {
      const [active, past] = await Promise.all([
        firestoreService.getConversations(currentUserId, {
          activeCollegeCode: user?.college_code,
          includeArchived: showArchivedConversations,
          inboxScope: "active",
        }),
        firestoreService.getConversations(currentUserId, {
          activeCollegeCode: user?.college_code,
          includeArchived: showArchivedConversations,
          inboxScope: "past",
        }),
      ]);
      setContacts(active);
      setPastContacts(past);
      const added =
        active.find((c) => c.id === studentId) ??
        past.find((c) => c.id === studentId);
      if (added) setSelectedContact(added);
    } catch {
      refreshConversations();
    }
  };

  const conversationIdFor = useCallback((c: Conversation) => {
    return (
      c.conversationId ||
      (currentUserId ? `${currentUserId}_${c.id}` : "")
    );
  }, [currentUserId]);

  const confirmArchiveConversation = useCallback(async () => {
    if (!currentUserId || !archiveModalContact) return;
    const convId = conversationIdFor(archiveModalContact);
    if (!convId) {
      setListFeedback(
        buildFeedback(
          "Could not archive",
          "Missing conversation id. Try again after the list refreshes.",
          "error",
        ),
      );
      return;
    }
    setArchiveBusy(true);
    try {
      await firestoreService.counselorArchiveConversation(
        currentUserId,
        convId,
      );
      setArchiveModalContact(null);
      refreshConversations();
    } catch (e) {
      console.error("Archive conversation failed:", e);
      setListFeedback(
        buildFeedback(
          "Could not archive",
          "Please check your connection and try again.",
          "error",
        ),
      );
    } finally {
      setArchiveBusy(false);
    }
  }, [archiveModalContact, currentUserId, conversationIdFor, refreshConversations]);

  if (selectedContact) {
    return (
      <ChatView
        contact={selectedContact}
        onThreadRepaired={refreshConversations}
        onBack={() => {
          setSelectedContact(null);
          refreshConversations();
          setAutoOpenLocked(true);
          if (studentId) {
            router.setParams({ studentId: undefined });
          }
        }}
      />
    );
  }

  const TABS: FilterTab[] = ["All Messages", "Unread"];

  const filtered =
    activeTab === "All Messages"
      ? listContacts
      : listContacts.filter((c) => c.isUnread);

  const unreadCount = contactsWithPresence.filter((c) => c.isUnread).length;

  return (
    <View style={{ flex: 1, backgroundColor: AURORA.bgMessages, marginBottom: 40 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Header + Filter Tabs (fixed top section) ─────────────── */}
        <View
          style={{
            flexShrink: 0,
            backgroundColor: AURORA.bgMessages,
            zIndex: 1,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: AURORA.border,
              gap: 12,
            }}
          >
            <LetterAvatar
              name={user?.full_name ?? "Counselor"}
              size={46}
              avatarUrl={user?.avatar_url}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800" }}
              >
                Messages
              </Text>
              <Text
                style={{ color: AURORA.textSec, fontSize: 12, marginTop: 1 }}
              >
                {unreadCount} Unread Conversation{unreadCount !== 1 ? "s" : ""}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 7,
                paddingHorizontal: 10,
                borderRadius: 12,
                backgroundColor: AURORA.blue,
                borderWidth: 1.5,
                borderColor: "rgba(255,255,255,0.25)",
                shadowColor: AURORA.blue,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 5,
                elevation: 3,
              }}
              onPress={() => router.push("/(counselor)/session-history")}
              activeOpacity={0.85}
            >
              {/* <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.22)",
                }}
              >
                <RotateCcw size={12} color="#FFFFFF" />
              </View> */}
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 11,
                  fontWeight: "800",
                  letterSpacing: 0.2,
                }}
              >
                Session History
              </Text>
              <ChevronRight size={12} color="#FFFFFF" />
            </TouchableOpacity>
            {/* <TouchableOpacity style={{ padding: 6 }} activeOpacity={0.7}>
                            <Search size={22} color={AURORA.textSec} />
                        </TouchableOpacity> */}
          </View>

          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: "row", gap: 8 }}
              style={{ flexGrow: 0 }}
            >
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 5,
                    borderRadius: 30,
                    marginTop: 8,
                    backgroundColor:
                      activeTab === tab ? AURORA.blue : "transparent",
                    borderWidth: 1.5,
                    borderColor:
                      activeTab === tab ? AURORA.blue : AURORA.borderLight,
                    minWidth: 88,
                    alignSelf: "flex-start",
                  }}
                >
                  <Text
                    style={{
                      color: activeTab === tab ? "#FFFFFF" : "#A8B8DC",
                      fontSize: 13,
                      fontWeight: activeTab === tab ? "700" : "500",
                    }}
                  >
                    {tab === "Unread" ? `Unread (${unreadCount})` : tab}
                  </Text>
                </TouchableOpacity>
              ))}
              <Pressable
                onPress={() =>
                  setShowPastCollegeConversations((prev) => !prev)
                }
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: showPastCollegeConversations,
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 30,
                  borderWidth: 1.5,
                  borderColor: showPastCollegeConversations
                    ? AURORA.blue
                    : AURORA.borderLight,
                  backgroundColor: showPastCollegeConversations
                    ? "rgba(45,107,255,0.14)"
                    : "transparent",
                  alignSelf: "flex-start",
                }}
              >
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: showPastCollegeConversations
                      ? AURORA.blue
                      : AURORA.borderLight,
                    backgroundColor: showPastCollegeConversations
                      ? AURORA.blue
                      : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPastCollegeConversations ? (
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  ) : null}
                </View>
                <Text
                  style={{
                    color: showPastCollegeConversations ? "#FFFFFF" : "#A8B8DC",
                    fontSize: 12,
                    fontWeight: showPastCollegeConversations ? "700" : "500",
                  }}
                >
                  Past college
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setShowArchivedConversations((prev) => !prev)
                }
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: showArchivedConversations,
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 30,
                  borderWidth: 1.5,
                  borderColor: showArchivedConversations
                    ? AURORA.blue
                    : AURORA.borderLight,
                  backgroundColor: showArchivedConversations
                    ? "rgba(45,107,255,0.14)"
                    : "transparent",
                  alignSelf: "flex-start",
                }}
              >
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: showArchivedConversations
                      ? AURORA.blue
                      : AURORA.borderLight,
                    backgroundColor: showArchivedConversations
                      ? AURORA.blue
                      : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showArchivedConversations ? (
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  ) : null}
                </View>
                <Text
                  style={{
                    color: showArchivedConversations ? "#FFFFFF" : "#A8B8DC",
                    fontSize: 12,
                    fontWeight: showArchivedConversations ? "700" : "500",
                  }}
                >
                  Show archived
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>

        {/* ── Conversation List (scrollable, fills remaining space) ─── */}
        <ScrollView
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={{ paddingTop: 60, alignItems: "center" }}>
              <ActivityIndicator size="large" color={AURORA.blue} />
              <Text
                style={{ color: AURORA.textMuted, fontSize: 14, marginTop: 12 }}
              >
                Loading conversations...
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ paddingTop: 60, alignItems: "center" }}>
              <Text
                style={{
                  color: AURORA.textMuted,
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                {showPastCollegeConversations
                  ? pastContacts.length === 0
                    ? "No past-college conversations. Transferred students and older college threads appear here (read-only)."
                    : activeTab === "Unread"
                      ? "No unread past-college conversations."
                      : "No conversations match this filter."
                  : contacts.length === 0
                    ? "No conversations yet. Tap + to add a student, or invite from the Student Directory."
                    : activeTab === "Unread"
                      ? "No unread conversations. Try All Messages, Past college, or Show archived."
                      : !showArchivedConversations
                        ? "No conversations match this filter. Turn on Show archived to see hidden threads."
                        : "No conversations match this filter."}
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <ConversationRow
                key={item.id}
                item={item}
                onPress={() => setSelectedContact(item)}
                onLongPress={() => setArchiveModalContact(item)}
              />
            ))
          )}
        </ScrollView>

        {!showPastCollegeConversations ? (
        <TouchableOpacity
          onPress={() => setShowAddStudentModal(true)}
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            width: 56,
            height: 56,
            marginBottom: 90,
            borderRadius: 28,
            backgroundColor: AURORA.blue,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: AURORA.blue,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 8,
          }}
          activeOpacity={0.85}
        >
          <PenSquare size={22} color="#FFFFFF" />
        </TouchableOpacity>
        ) : null}

        {user?.id ? (
          <SelectStudentModal
            visible={showAddStudentModal}
            onClose={() => setShowAddStudentModal(false)}
            existingStudentIds={contacts.map((c) => c.id)}
            counselorId={user.id}
            counselorName={user?.full_name ?? "Counselor"}
            counselorAvatar={user?.avatar_url}
            onConversationCreated={handleConversationCreated}
          />
        ) : null}

        <Modal
          visible={archiveModalContact !== null}
          transparent
          animationType="fade"
          onRequestClose={() => !archiveBusy && setArchiveModalContact(null)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              paddingHorizontal: 24,
              backgroundColor: "rgba(0,0,0,0.55)",
            }}
          >
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => !archiveBusy && setArchiveModalContact(null)}
            />
            <View
              style={{
                backgroundColor: AURORA.card,
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: AURORA.border,
                zIndex: 1,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 18,
                  fontWeight: "800",
                  marginBottom: 8,
                }}
              >
                Hide conversation?
              </Text>
              <Text
                style={{
                  color: AURORA.textSec,
                  fontSize: 14,
                  lineHeight: 20,
                  marginBottom: 18,
                }}
              >
                This removes{" "}
                <Text style={{ fontWeight: "700", color: AURORA.textPrimary }}>
                  {archiveModalContact?.name ?? "this student"}
                </Text>{" "}
                from your list. It does not delete messages or the student’s
                chat.
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => !archiveBusy && setArchiveModalContact(null)}
                  disabled={archiveBusy}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: AURORA.border,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: AURORA.textPrimary,
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmArchiveConversation}
                  disabled={archiveBusy}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: "rgba(245,158,11,0.22)",
                    borderWidth: 1,
                    borderColor: "rgba(245,158,11,0.55)",
                    alignItems: "center",
                  }}
                >
                  {archiveBusy ? (
                    <ActivityIndicator color={AURORA.orange} />
                  ) : (
                    <Text
                      style={{
                        color: AURORA.orange,
                        fontSize: 15,
                        fontWeight: "800",
                      }}
                    >
                      Archive message
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <InfoGuideModal
          guide={listFeedback}
          onClose={() => setListFeedback(null)}
        />
      </SafeAreaView>
    </View>
  );
}
