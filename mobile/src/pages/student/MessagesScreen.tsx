import { AppText as Text } from "../../components/common/AppText";
import { AppTextInput as TextInput } from "../../components/common/AppTextInput";
/**
 * Student Messages Screen
 * Receives messages and session invites from counselors.
 * Loads from Firestore.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  CalendarPlus,
  Send,
  PenSquare,
  Check,
} from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../stores/AuthContext";
import { firestoreService } from "../../services/firebase-firestore.service";
import { AURORA } from "../../constants/aurora-colors";
import { STUDENT_TAB_BAR_BOTTOM_CLEARANCE } from "../../../constants/student-tab-bar";
import { LetterAvatar } from "../../components/common/LetterAvatar";
import ScheduleInviteCard, {
  type ScheduleInviteData,
  type TimeSlot,
} from "../../components/student/ScheduleInviteCard";
import SessionRequestCard, {
  type SessionRequestData,
} from "../../components/student/SessionRequestCard";
import SessionRequestDetailsModal from "../../components/student/SessionRequestDetailsModal";
import StudentSessionRequestModal, {
  type SessionRequestFormData,
} from "../../components/student/StudentSessionRequestModal";
import {
  counselorHasJournalAccessForCounselor,
  grantCounselorJournalAccess,
} from "../../services/mood-firestore-v2.service";
import SelectCounselorModal, {
  type Counselor,
} from "../../components/student/SelectCounselorModal";
import {
  isOpenSessionRequestExpired,
  parsePreferredTimeToDate,
} from "../../utils/dateHelpers";
import { isCounselorSelectableByStudent } from "../../utils/counselorApprovalForAdmin";
import { auditLogsService } from "../../services/audit-logs.service";
import { subscribeToUsersPresence } from "../../services/firebase-presence.service";
import { usePeerPresence } from "../../hooks/usePeerPresence";
import * as Clipboard from "expo-clipboard";
import {
  InfoGuideModal,
  type InfoGuideContent,
} from "../../components/common/InfoGuideModal";
import { AuroraConfirmModal } from "../../components/common/AuroraConfirmModal";
import {
  AuroraActionSheetModal,
  type AuroraActionSheetContent,
} from "../../components/common/AuroraActionSheetModal";
import { buildFeedback } from "../../utils/aurora-feedback";
import ConversationReadOnlyBanner from "../../components/messages/ConversationReadOnlyBanner";

type TabType = "All messages" | "Unread";

/** Matches counselor + Firestore preview sanitization (`firebase-firestore.service`). */
const AUTO_ACCEPTED_PREFIX = "__AUTO_ACCEPTED__";
const SESSION_ACCEPT_NOTICE_TEXT = "Just accepted your request";

function matchesSessionAcceptNoticeText(raw: string): boolean {
  const t = raw.trim().replace(/\s+/g, " ").toLowerCase();
  return t === SESSION_ACCEPT_NOTICE_TEXT.toLowerCase();
}

interface CounselorContact {
  id: string;
  conversationId: string;
  name: string;
  preview: string;
  time: string;
  avatar: string;
  isOnline: boolean;
  isUnread: boolean;
  messagingClosed?: boolean;
  isPastCollege?: boolean;
}

function formatConversationTimeLabel(raw: string): string {
  const text = (raw || "").trim();
  if (!text) return "";
  if (/^\d+\s*[mh] ago$/i.test(text))
    return text.toLowerCase().replace(/\s+/g, "");
  if (/^\d+\s*min ago$/i.test(text)) return text.toLowerCase();
  if (/^(just now|now)$/i.test(text)) return "Just now";
  return text;
}

interface TextMessage {
  id: string;
  senderId: "me" | "them";
  type: "text";
  text: string;
  time: string;
}

interface SessionMessage {
  id: string;
  senderId: "me" | "them";
  type: "session";
  session: ScheduleInviteData & {
    timeSlots?: TimeSlot[];
    note?: string;
    sessionStatus?: string;
    agreedSlot?: { date: string; time: string };
    sessionDocCreatedAt?: unknown;
    sessionDocUpdatedAt?: unknown;
  };
  time: string;
}

interface SessionRequestMessage {
  id: string;
  senderId: "me" | "them";
  type: "session_request";
  sessionRequest: SessionRequestData;
  time: string;
}

type ChatMessage = TextMessage | SessionMessage | SessionRequestMessage;

// ─── Contact Row ───────────────────────────────────────────────────────────────
function ContactRow({
  item,
  onPress,
}: {
  item: CounselorContact;
  onPress: () => void;
}) {
  const isPastCollege =
    item.isPastCollege === true || item.messagingClosed === true;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderRadius: 14,
        backgroundColor: item.isUnread
          ? "rgba(45,107,255,0.10)"
          : "transparent",
        borderBottomWidth: 1,
        borderBottomColor: AURORA.border,
      }}
    >
      <View style={{ position: "relative", marginRight: 12 }}>
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
            borderColor: AURORA.bgMessages,
          }}
        />
      </View>
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
            <Text
              style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {isPastCollege ? (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: "rgba(251,191,36,0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(251,191,36,0.4)",
                }}
              >
                <Text
                  style={{
                    color: "#FCD34D",
                    fontSize: 8,
                    fontWeight: "700",
                  }}
                >
                  PAST
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={{
              fontSize: 12,
              fontWeight: item.isUnread ? "700" : "400",
              color: item.isUnread ? AURORA.blue : AURORA.textSec,
              letterSpacing: item.isUnread ? 0.5 : 0,
            }}
          >
            {formatConversationTimeLabel(item.time)}
          </Text>
        </View>
        <Text
          style={{
            color: item.isUnread ? "#D7E4FF" : AURORA.textSec,
            fontSize: 13,
            fontWeight: item.isUnread ? "600" : "400",
          }}
          numberOfLines={1}
        >
          {item.preview}
        </Text>
      </View>
      {item.isUnread ? (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: AURORA.blue,
            marginLeft: 10,
          }}
        />
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Direct Message Chat ───────────────────────────────────────────────────────
function DirectMessageView({
  contact,
  onBack,
  onThreadRepaired,
  autoOpenSessionRequestModal = false,
}: {
  contact: CounselorContact;
  onBack: () => void;
  onThreadRepaired?: () => void;
  autoOpenSessionRequestModal?: boolean;
}) {
  const { user } = useAuth();
  const [readOnly, setReadOnly] = useState(
    contact.messagingClosed === true || contact.isPastCollege === true,
  );
  const [message, setMessage] = useState("");
  /** Mirrors the composer so Send uses the latest text (avoids Android RN lag vs `message` state). */
  const messageDraftRef = useRef("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSessionRequestModal, setShowSessionRequestModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSessionRequest, setSelectedSessionRequest] =
    useState<SessionRequestData | null>(null);
  const [editingSessionRequest, setEditingSessionRequest] =
    useState<SessionRequestData | null>(null);
  const [pendingSessionRequestAfterConsent, setPendingSessionRequestAfterConsent] =
    useState<SessionRequestFormData | null>(null);
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
  const peerOnline = usePeerPresence(contact.id);
  const openedByParamRef = useRef(false);

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
  }, [contact.conversationId]);

  useEffect(() => {
    setReadOnly(
      contact.messagingClosed === true || contact.isPastCollege === true,
    );
  }, [contact.messagingClosed, contact.isPastCollege, contact.conversationId]);

  useEffect(() => {
    if (!contact.conversationId || !user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const repaired =
          await firestoreService.repairConversationCollegeTagIfAligned(
            contact.conversationId!,
            user.id,
          );
        const state = await firestoreService.getConversationMessagingState(
          contact.conversationId!,
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
  }, [contact.conversationId, user?.id, onThreadRepaired]);

  useEffect(() => {
    if (!autoOpenSessionRequestModal) return;
    if (openedByParamRef.current) return;
    openedByParamRef.current = true;
    setShowSessionRequestModal(true);
  }, [autoOpenSessionRequestModal]);

  useEffect(() => {
    if (!contact.conversationId || !user?.id) {
      setLoadingMessages(false);
      return;
    }
    if (!readOnly) {
      firestoreService
        .markConversationAsRead(contact.conversationId, user.id)
        .catch(() => {});
    }
    setLoadingMessages(true);
    const unsub = firestoreService.subscribeConversationMessages(
      contact.conversationId,
      user.id,
      (msgs) => {
        setMessages(msgs as ChatMessage[]);
        setLoadingMessages(false);
      },
      () => {
        setMessages([]);
        setLoadingMessages(false);
      },
    );
    return unsub;
  }, [contact.conversationId, user?.id, readOnly]);

  useEffect(() => {
    if (loadingMessages || messages.length === 0) return;
    if (!pendingScrollToEndRef.current) return;
    const t = setTimeout(() => {
      if (!pendingScrollToEndRef.current) return;
      scrollChatToEnd();
      pendingScrollToEndRef.current = false;
    }, 120);
    return () => clearTimeout(t);
  }, [
    loadingMessages,
    messages.length,
    contact.conversationId,
    scrollChatToEnd,
  ]);

  useEffect(() => {
    if (!loadingMessages && messages.length === 0) {
      pendingScrollToEndRef.current = false;
    }
  }, [loadingMessages, messages.length]);

  const sendMessage = async () => {
    if (readOnly) return;
    const text = messageDraftRef.current.trim();
    if (!text || !user?.id || !contact.conversationId || sending) return;
    setSending(true);
    try {
      await firestoreService.sendTextMessage(
        contact.conversationId,
        user.id,
        text,
      );
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
      const msg =
        e instanceof Error ? e.message : "Please wait and try again.";
      setFeedback(buildFeedback("Could not send message", msg, "error"));
    } finally {
      setSending(false);
    }
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

  const handleConfirmSession = async (
    slot: TimeSlot,
    invite: ScheduleInviteData,
  ) => {
    if (readOnly) return;
    if (!user?.id || !contact.conversationId || sending) return;
    const sid = invite.id?.trim();
    if (!sid || String(sid).startsWith("session_")) {
      setFeedback(
        buildFeedback(
          "Cannot confirm",
          "This invite is missing a valid session link. Ask your counselor to send the times again.",
          "error",
        ),
      );
      return;
    }
    setSending(true);
    try {
      await firestoreService.studentConfirmFinalSlot(sid, user.id, slot, {
        conversationId: contact.conversationId,
        counselorId: contact.id,
      });

      await grantCounselorJournalAccess(user.id, contact.id);

      // Automated green "Accepted" message for the thread.
      await firestoreService.sendTextMessage(
        contact.conversationId,
        user.id,
        `${AUTO_ACCEPTED_PREFIX}Just accepted your request`,
      );

      setTimeout(scrollChatToEnd, Platform.OS === "android" ? 120 : 80);
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      console.error("Failed to confirm session time:", e);
      setFeedback(buildFeedback("Could not confirm session", message, "error"));
    } finally {
      setSending(false);
    }
  };

  const executeSendSessionRequest = async (data: SessionRequestFormData) => {
    if (!user?.id || sending) return;
    if (!contact.conversationId) {
      setFeedback(
        buildFeedback(
          "Can't send request",
          "This conversation isn't ready yet. Go back and open your counselor's chat again.",
          "warning",
        ),
      );
      return;
    }
    setSending(true);
    try {
      const preferredTimeStr = data.preferredDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      if (editingSessionRequest?.id && editingSessionRequest.sessionId) {
        await firestoreService.updateSessionRequestSchedule(
          contact.conversationId,
          user.id,
          editingSessionRequest.id,
          editingSessionRequest.sessionId,
          preferredTimeStr,
          data.note,
        );

        setShowSessionRequestModal(false);
        setEditingSessionRequest(null);
        setTimeout(scrollChatToEnd, Platform.OS === "android" ? 120 : 80);
        return;
      }

      await firestoreService.sendSessionRequest(
        contact.conversationId,
        user.id,
        data.preferredDate,
        data.note,
      );

      await grantCounselorJournalAccess(user.id, contact.id);

      setShowSessionRequestModal(false);
      setTimeout(scrollChatToEnd, Platform.OS === "android" ? 120 : 80);
    } catch (e) {
      console.error("Failed to send session request:", e);
      const msg =
        e instanceof Error ? e.message : "Please try again in a moment.";
      setFeedback(buildFeedback("Could not send request", msg, "error"));
    } finally {
      setSending(false);
    }
  };

  const handleSendSessionRequest = async (data: SessionRequestFormData) => {
    if (!user?.id || sending) return;
    if (!contact.conversationId) {
      setFeedback(
        buildFeedback(
          "Can't send request",
          "This conversation isn't ready yet. Go back and open your counselor's chat again.",
          "warning",
        ),
      );
      return;
    }

    if (editingSessionRequest?.id && editingSessionRequest.sessionId) {
      await executeSendSessionRequest(data);
      return;
    }

    try {
      const hasAccess = await counselorHasJournalAccessForCounselor(
        user.id,
        contact.id,
      );
      if (!hasAccess) {
        setPendingSessionRequestAfterConsent(data);
        return;
      }
      await executeSendSessionRequest(data);
    } catch (e) {
      console.error("Failed to verify journal consent:", e);
      const msg =
        e instanceof Error ? e.message : "Please try again in a moment.";
      setFeedback(buildFeedback("Something went wrong", msg, "error"));
    }
  };

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
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: AURORA.border,
            }}
          >
            <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
              <ArrowLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <LetterAvatar
                name={contact.name}
                size={40}
                avatarUrl={contact.avatar || undefined}
              />
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}
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
                    {peerOnline ? "Online now" : "Offline"}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ width: 30 }} />
          </View>

          {/* Privacy Banner */}
          {/* <View
            style={{
              backgroundColor: "rgba(124,58,237,0.15)",
              borderWidth: 1,
              borderColor: "rgba(124,58,237,0.3)",
              borderRadius: 12,
              marginHorizontal: 16,
              marginTop: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <Text
              style={{
                color: AURORA.purple,
                fontSize: 11,
                fontWeight: "700",
                textAlign: "center",
                letterSpacing: 0.8,
              }}
            >
              THIS IS A PRIVATE CONVERSATION WITH YOUR COUNSELOR.
            </Text>
          </View> */}

          {readOnly ? <ConversationReadOnlyBanner role="student" /> : null}

          {/* Date label */}
          <Text
            style={{
              color: AURORA.textMuted,
              fontSize: 12,
              fontWeight: "600",
              textAlign: "center",
              marginTop: 16,
              marginBottom: 8,
              letterSpacing: 0.5,
            }}
          >
            TODAY
          </Text>

          {/* Messages */}
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                ...(Platform.OS === "android"
                  ? { paddingLeft: 14, paddingRight: 6 }
                  : { paddingHorizontal: 16 }),
                paddingTop: 8,
                paddingBottom: 20,
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
                messages.map((msg) => {
                  const isMe = msg.senderId === "me";
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
                  const senderName = isMe ? "You" : contact.name;
                  const messageContent =
                    msg.type === "text" ? (
                      <Pressable
                        onLongPress={() => {
                          const canCopy = !displayText.startsWith("[Deleted");
                          const actions: AuroraActionSheetContent["actions"] =
                            [];
                          if (canCopy) {
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
                          if (isMe) {
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
                            alignSelf: isMe ? "flex-end" : "flex-start",
                            overflow:
                              Platform.OS === "android" ? "visible" : undefined,
                            backgroundColor: isMe ? AURORA.blue : AURORA.card,
                            borderRadius: 18,
                            borderBottomLeftRadius: isMe ? 18 : 4,
                            borderBottomRightRadius: isMe ? 4 : 18,
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
                                  color: displayText.startsWith("[Deleted")
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
                      <Pressable
                        onLongPress={() => {
                          if (!isMe) return;
                          confirmDeleteMessage(msg.id, "session_request");
                        }}
                      >
                        <View>
                          {(() => {
                            const requestExpired = isOpenSessionRequestExpired({
                              status: msg.sessionRequest.status,
                              preferredTime: msg.sessionRequest.preferredTime,
                              requestedAtMs: msg.sessionRequest.requestedAtMs,
                            });
                            return (
                          <SessionRequestCard
                            data={msg.sessionRequest}
                            isFromMe={isMe}
                            isExpired={requestExpired}
                            onViewDetails={() => {
                              setSelectedSessionRequest(msg.sessionRequest);
                              setShowDetailsModal(true);
                            }}
                            onEdit={() => {
                              setEditingSessionRequest(msg.sessionRequest);
                              setShowSessionRequestModal(true);
                            }}
                          />
                            );
                          })()}
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.6)",
                              fontSize: 11,
                              marginTop: 4,
                              textAlign: isMe ? "right" : "left",
                            }}
                          >
                            {msg.time}
                          </Text>
                        </View>
                      </Pressable>
                    ) : (
                      <Pressable
                        onLongPress={() => {
                          if (!isMe) return;
                          confirmDeleteMessage(msg.id, "session");
                        }}
                      >
                        <View>
                          <ScheduleInviteCard
                            data={{
                              ...msg.session,
                              note: msg.session.note,
                              timeSlots: msg.session.timeSlots,
                              sessionStatus: msg.session.sessionStatus,
                              agreedSlot: msg.session.agreedSlot,
                              sessionDocCreatedAt: msg.session.sessionDocCreatedAt,
                              sessionDocUpdatedAt: msg.session.sessionDocUpdatedAt,
                            }}
                            senderLabel="Aurora Academic Support"
                            isFromMe={isMe}
                            confirmBusy={sending}
                            onConfirm={
                              !readOnly &&
                              !isMe &&
                              msg.session.id &&
                              !String(msg.session.id).startsWith("session_") &&
                              !(
                                msg.session.sessionStatus &&
                                [
                                  "confirmed",
                                  "completed",
                                  "missed",
                                  "cancelled",
                                  "expired",
                                ].includes(msg.session.sessionStatus)
                              )
                                ? (slot) =>
                                    handleConfirmSession(slot, {
                                      ...msg.session,
                                      id: msg.session.id,
                                    })
                                : undefined
                            }
                          />
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.6)",
                              fontSize: 11,
                              marginTop: 4,
                              textAlign: isMe ? "right" : "left",
                            }}
                          >
                            {msg.time}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  return (
                    <View key={msg.id} style={{ marginBottom: 14 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: isMe ? "flex-end" : "flex-start",
                          alignItems: "flex-end",
                          gap: Platform.OS === "android" ? 6 : 8,
                        }}
                      >
                        {!isMe && (
                          <View style={{ marginBottom: 14 }}>
                            <LetterAvatar
                              name={contact.name}
                              size={34}
                              avatarUrl={contact.avatar || undefined}
                            />
                          </View>
                        )}
                        <View
                          style={{
                            flex: 1,
                            minWidth: 0,
                            maxWidth:
                              Platform.OS === "android" ? "92%" : "78%",
                            alignItems: isMe ? "flex-end" : "flex-start",
                          }}
                        >
                          <Text
                            style={{
                              color: AURORA.textSec,
                              fontSize: 11,
                              marginBottom: 3,
                              textAlign: isMe ? "right" : "left",
                              alignSelf: "stretch",
                            }}
                          >
                            {senderName}
                          </Text>
                          {messageContent}
                        </View>
                        {/* {isMe && (
                          <View style={{ marginBottom: 14 }}>
                            <LetterAvatar
                              name={user?.full_name ?? "You"}
                              size={34}
                              avatarUrl={user?.avatar_url}
                            />
                          </View>
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
          {/* Input Bar */}
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
              onPress={() => {
                setEditingSessionRequest(null);
                setShowSessionRequestModal(true);
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                marginBottom: 35,
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
                marginBottom: 35,
                color: "#FFFFFF",
                fontSize: 14,
                borderWidth: 1,
                borderColor: AURORA.border,
              }}
              placeholder="Type a message..."
              placeholderTextColor="#9FB0D4"
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
                marginBottom: 35,
                backgroundColor: AURORA.blue,
                alignItems: "center",
                justifyContent: "center",
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
              marginBottom: 14,
              paddingHorizontal: 16,
            }}
          >
            {/* Messages are encrypted and shared only with your counselor. */}
          </Text>
          </>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      <StudentSessionRequestModal
        visible={showSessionRequestModal}
        initialPreferredDate={
          editingSessionRequest?.preferredTime
            ? parsePreferredTimeToDate(editingSessionRequest.preferredTime)
            : null
        }
        initialNote={editingSessionRequest?.note ?? undefined}
        journalConsent={
          pendingSessionRequestAfterConsent
            ? {
                title: "Confirm session request",
                body: `Are you sure you want to request a session with ${contact.name}? If you continue, they may review your mood check-ins and journals in Aurora so they can support you. Only continue if you genuinely want help.`,
                cancelLabel: "Cancel",
                confirmLabel: "Yes, send request",
                onCancel: () => setPendingSessionRequestAfterConsent(null),
                onConfirm: () => {
                  const data = pendingSessionRequestAfterConsent;
                  setPendingSessionRequestAfterConsent(null);
                  if (data) void executeSendSessionRequest(data);
                },
              }
            : null
        }
        onClose={() => {
          setShowSessionRequestModal(false);
          setEditingSessionRequest(null);
          setPendingSessionRequestAfterConsent(null);
        }}
        onSend={handleSendSessionRequest}
      />
      <SessionRequestDetailsModal
        visible={showDetailsModal}
        data={selectedSessionRequest}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedSessionRequest(null);
        }}
      />
      <InfoGuideModal guide={feedback} onClose={() => setFeedback(null)} />
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
              contact.conversationId,
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

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    counselorId?: string;
    openSessionRequest?: string;
  }>();
  const [activeTab, setActiveTab] = useState<TabType>("All messages");
  const [selectedContact, setSelectedContact] =
    useState<CounselorContact | null>(null);
  const [contacts, setContacts] = useState<CounselorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelectCounselorModal, setShowSelectCounselorModal] =
    useState(false);
  const [onlineByCounselorId, setOnlineByCounselorId] = useState<
    Record<string, boolean>
  >({});
  const [
    autoOpenSessionRequestForContact,
    setAutoOpenSessionRequestForContact,
  ] = useState(false);
  const [listFeedback, setListFeedback] = useState<InfoGuideContent | null>(
    null,
  );
  const [showPastCollegeConversations, setShowPastCollegeConversations] =
    useState(false);
  const [pastContacts, setPastContacts] = useState<CounselorContact[]>([]);

  /** Avoid duplicate opens / Strict Mode double-invoke while dashboard deep-link runs */
  const counselorDeepLinkHandledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      firestoreService.getConversationsForStudent(user.id, {
        activeCollegeCode: user.college_code,
        inboxScope: "active",
      }),
      firestoreService.getConversationsForStudent(user.id, {
        activeCollegeCode: user.college_code,
        inboxScope: "past",
      }),
    ])
      .then(([active, past]) => {
        if (!cancelled) {
          setContacts(active as CounselorContact[]);
          setPastContacts(past as CounselorContact[]);
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
  }, [user?.id, user?.college_code]);

  useEffect(() => {
    const ids = [...contacts, ...pastContacts].map((c) => c.id);
    if (ids.length === 0) {
      setOnlineByCounselorId({});
      return;
    }
    return subscribeToUsersPresence(ids, setOnlineByCounselorId);
  }, [contacts, pastContacts]);

  const refreshConversations = () => {
    if (!user?.id) return;
    Promise.all([
      firestoreService.getConversationsForStudent(user.id, {
        activeCollegeCode: user.college_code,
        inboxScope: "active",
      }),
      firestoreService.getConversationsForStudent(user.id, {
        activeCollegeCode: user.college_code,
        inboxScope: "past",
      }),
    ])
      .then(([active, past]) => {
        setContacts(active as CounselorContact[]);
        setPastContacts(past as CounselorContact[]);
      })
      .catch(() => {
        setContacts([]);
        setPastContacts([]);
      });
  };

  const handleSelectCounselor = async (counselor: Counselor) => {
    if (!user?.id) return;
    try {
      await firestoreService.addConversation(
        counselor.id,
        {
          id: user.id,
          name: user.full_name ?? "Student",
          avatar: user.avatar_url ?? "",
        },
        {
          name: counselor.full_name ?? "Counselor",
          avatar: counselor.avatar_url,
        },
      );
      const contact: CounselorContact = {
        id: counselor.id,
        conversationId: `${counselor.id}_${user.id}`,
        name: counselor.full_name ?? "Counselor",
        preview: "No messages yet",
        time: "Just now",
        avatar: counselor.avatar_url ?? "",
        isOnline: false,
        isUnread: false,
      };
      setSelectedContact(contact);
      refreshConversations();
    } catch (e) {
      console.error("Failed to start conversation:", e);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    const counselorIdRaw =
      typeof params.counselorId === "string" ? params.counselorId : "";
    const counselorId = counselorIdRaw.trim();
    const shouldOpenRequest = params.openSessionRequest === "1";

    if (!counselorId) {
      counselorDeepLinkHandledRef.current = null;
      return;
    }

    const linkKey = `${counselorId}:${shouldOpenRequest ? "1" : "0"}`;
    if (counselorDeepLinkHandledRef.current === linkKey) return;
    counselorDeepLinkHandledRef.current = linkKey;

    let cancelled = false;

    const clearCounselorRouteParams = () => {
      router.setParams({
        counselorId: undefined,
        openSessionRequest: undefined,
      });
    };

    const openThreadFromParam = async () => {
      try {
        const [activeConvos, pastConvos] = await Promise.all([
          firestoreService.getConversationsForStudent(user.id, {
            activeCollegeCode: user.college_code,
            inboxScope: "active",
          }),
          firestoreService.getConversationsForStudent(user.id, {
            activeCollegeCode: user.college_code,
            inboxScope: "past",
          }),
        ]);
        if (cancelled) return;

        let contact =
          (activeConvos as CounselorContact[]).find(
            (c) => c.id === counselorId,
          ) ??
          (pastConvos as CounselorContact[]).find((c) => c.id === counselorId);

        if (!contact) {
          const users = await firestoreService.getCounselorsForStudent(user.id);
          if (cancelled) return;
          const raw = (users as Record<string, unknown>[]).find(
            (u) => String(u.id ?? "") === counselorId,
          );
          if (
            !raw ||
            !isCounselorSelectableByStudent(raw as unknown as Record<string, unknown>)
          ) {
            clearCounselorRouteParams();
            setListFeedback(
              buildFeedback(
                "Counselor unavailable",
                "That counselor is not available for messaging yet.",
                "warning",
              ),
            );
            return;
          }
          const counselor: Counselor = {
            id: String(raw.id ?? ""),
            full_name:
              typeof raw.full_name === "string" ? raw.full_name : undefined,
            avatar_url:
              typeof raw.avatar_url === "string" ? raw.avatar_url : undefined,
          };

          await firestoreService.addConversation(
            counselor.id,
            {
              id: user.id,
              name: user.full_name ?? "Student",
              avatar: user.avatar_url ?? "",
            },
            {
              name: counselor.full_name ?? "Counselor",
              avatar: counselor.avatar_url,
            },
          );
          if (cancelled) return;

          contact = {
            id: counselor.id,
            conversationId: `${counselor.id}_${user.id}`,
            name: counselor.full_name ?? "Counselor",
            preview: "No messages yet",
            time: "Just now",
            avatar: counselor.avatar_url ?? "",
            isOnline: false,
            isUnread: false,
          };
        }

        if (cancelled) return;

        setSelectedContact(contact);
        setAutoOpenSessionRequestForContact(shouldOpenRequest);
        clearCounselorRouteParams();
        refreshConversations();
      } catch (e) {
        console.error("Failed opening counselor thread from params:", e);
        counselorDeepLinkHandledRef.current = null;
      }
    };

    void openThreadFromParam();

    return () => {
      cancelled = true;
      counselorDeepLinkHandledRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.counselorId, params.openSessionRequest, user?.id, router]);

  if (selectedContact) {
    return (
      <DirectMessageView
        contact={{
          ...selectedContact,
          isOnline: onlineByCounselorId[selectedContact.id] ?? false,
        }}
        autoOpenSessionRequestModal={autoOpenSessionRequestForContact}
        onThreadRepaired={refreshConversations}
        onBack={() => {
          setSelectedContact(null);
          setAutoOpenSessionRequestForContact(false);
          refreshConversations();
        }}
      />
    );
  }

  const TABS: TabType[] = ["All messages", "Unread"];
  const listContacts = showPastCollegeConversations ? pastContacts : contacts;
  const visibleContacts =
    activeTab === "Unread"
      ? listContacts.filter((c) => c.isUnread)
      : listContacts;

  return (
    <View style={{ flex: 1, backgroundColor: AURORA.bgMessages }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}
        >
          <Text
            style={{
              color: AURORA.blue,
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 0.8,
              marginBottom: 4,
            }}
          >
            COUNSELOR CONVERSATIONS
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "800" }}>
              Messages
            </Text>
            {/* <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity style={{ padding: 4 }}>
                                <Search size={22} color={AURORA.textSec} />
                            </TouchableOpacity>
                            <TouchableOpacity style={{ padding: 4 }}>
                                <Settings2 size={22} color={AURORA.textSec} />
                            </TouchableOpacity>
                        </View> */}
          </View>
          <Text style={{ color: AURORA.textSec, fontSize: 12, marginTop: 2 }}>
            You are chatting with your assigned counselors here.
          </Text>
        </View>

        {/* Tabs */}
        <View
          style={{
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: AURORA.border,
            marginTop: 8,
            paddingBottom: 10,
          }}
        >
          <View style={{ flexDirection: "row", gap: 10 }}>
            {TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active
                      ? "rgba(45,107,255,0.45)"
                      : AURORA.border,
                    backgroundColor: active
                      ? "rgba(45,107,255,0.16)"
                      : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: active ? AURORA.blue : AURORA.textSec,
                      fontSize: 14,
                      fontWeight: active ? "700" : "500",
                    }}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Pressable
            onPress={() => setShowPastCollegeConversations((prev) => !prev)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: showPastCollegeConversations }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: showPastCollegeConversations
                ? AURORA.blue
                : AURORA.border,
              alignSelf: "flex-start",
              backgroundColor: showPastCollegeConversations
                ? "rgba(45,107,255,0.14)"
                : "transparent",
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
                  : AURORA.border,
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
                color: showPastCollegeConversations ? AURORA.blue : AURORA.textSec,
                fontSize: 13,
                fontWeight: showPastCollegeConversations ? "700" : "500",
              }}
            >
              Past college
            </Text>
          </Pressable>
        </View>

        {/* Contact List */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: STUDENT_TAB_BAR_BOTTOM_CLEARANCE,
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
          ) : visibleContacts.length > 0 ? (
            visibleContacts.map((item) => (
              <ContactRow
                key={item.conversationId}
                item={{
                  ...item,
                  isOnline: onlineByCounselorId[item.id] ?? false,
                }}
                onPress={() =>
                  setSelectedContact({
                    ...item,
                    isOnline: onlineByCounselorId[item.id] ?? false,
                  })
                }
              />
            ))
          ) : activeTab === "Unread" ? (
            <View style={{ paddingTop: 60, alignItems: "center" }}>
              <Text
                style={{
                  color: AURORA.textMuted,
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                No unread counselor messages right now.
              </Text>
            </View>
          ) : showPastCollegeConversations ? (
            <View style={{ paddingTop: 60, alignItems: "center" }}>
              <Text
                style={{
                  color: AURORA.textMuted,
                  fontSize: 14,
                  textAlign: "center",
                  paddingHorizontal: 12,
                }}
              >
                No past-college conversations. Older college threads appear here
                as read-only history.
              </Text>
            </View>
          ) : (
            <View style={{ paddingTop: 60, alignItems: "center" }}>
              <Text
                style={{
                  color: AURORA.textMuted,
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                No conversations yet. Your counselor will invite you when
                they're ready to connect.
              </Text>
            </View>
          )}
        </ScrollView>

        {!showPastCollegeConversations ? (
        <TouchableOpacity
          onPress={() => setShowSelectCounselorModal(true)}
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
          activeOpacity={0.9}
        >
          <PenSquare size={22} color="#FFFFFF" />
        </TouchableOpacity>
        ) : null}
      </SafeAreaView>

      <SelectCounselorModal
        visible={showSelectCounselorModal}
        studentId={user?.id ?? ""}
        onClose={() => setShowSelectCounselorModal(false)}
        onSelect={handleSelectCounselor}
      />

      <InfoGuideModal
        guide={listFeedback}
        onClose={() => setListFeedback(null)}
      />
    </View>
  );
}
