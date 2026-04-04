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
  deleteDoc,
  onSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  type SessionHistoryBadge,
  EXPIRED_SESSION_RETENTION_MS,
  computeSessionHistoryBadge,
  getOverdueSchedulingState,
  getSessionScheduledDate,
} from '../utils/sessionScheduling';
import { normalizeScheduleWhitespace } from '../utils/dateHelpers';
import {
  resolveSessionsDocIdFromInviteMessageData,
  isPlaceholderSessionDocId,
  resolveSessionsDocIdForSessionCard,
} from '../utils/sessionInviteIds';

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
  detection_method: 'manual' | 'ai';
  sleep_quality?: number;
  classes_count?: number;
  exams_count?: number;
  deadlines_count?: number;
}

export interface ScheduleData {
  user_id: string;
  title: string;
  description?: string;
  event_date: Date;
  event_type: 'exam' | 'deadline' | 'meeting' | 'other';
}

export interface NotificationData {
  user_id: string;
  type: 'mood_reminder' | 'event_reminder' | 'counselor_message';
  message: string;
  status: 'pending' | 'sent' | 'read';
  scheduled_for: Date;
}

/** Firestore may store Timestamp or plain strings; normalize for scheduling + UI. */
function normalizeFirestoreSessionSlot(raw: unknown): { date: string; time: string } | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  let dateRaw: unknown = o.date ?? o.Date;
  let timeRaw: unknown = o.time ?? o.Time;

  const tsToDate = (v: unknown): Date | null => {
    if (v != null && typeof v === 'object' && typeof (v as { toDate?: () => Date }).toDate === 'function') {
      return (v as { toDate: () => Date }).toDate();
    }
    return null;
  }

  const dFromDateField = tsToDate(dateRaw);
  if (dFromDateField) {
    dateRaw = dFromDateField.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } else if (
    dateRaw != null &&
    typeof dateRaw === 'object' &&
    'seconds' in (dateRaw as object) &&
    typeof (dateRaw as { seconds?: unknown }).seconds === 'number'
  ) {
    const d = new Date((dateRaw as { seconds: number }).seconds * 1000);
    dateRaw = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  const tFromTimeField = tsToDate(timeRaw);
  if (tFromTimeField) {
    timeRaw = tFromTimeField.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } else if (
    timeRaw != null &&
    typeof timeRaw === 'object' &&
    'seconds' in (timeRaw as object) &&
    typeof (timeRaw as { seconds?: unknown }).seconds === 'number'
  ) {
    const d = new Date((timeRaw as { seconds: number }).seconds * 1000);
    timeRaw = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  const dateStr = dateRaw != null && String(dateRaw).trim() !== '' ? String(dateRaw).trim() : '';
  const timeStr = timeRaw != null && String(timeRaw).trim() !== '' ? String(timeRaw).trim() : '';
  if (!dateStr) return null;
  return {
    date: normalizeScheduleWhitespace(dateStr),
    time: normalizeScheduleWhitespace(timeStr),
  };
}

/** Last resort if normalize missed uncommon shapes but `date` / `time` exist as primitives. */
function looseSessionSlotFromRaw(raw: unknown): { date: string; time: string } | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const dr = o.date ?? o.Date;
  const tr = o.time ?? o.Time;
  if (dr == null) return null;
  const dateStr = String(dr).trim();
  if (!dateStr) return null;
  return {
    date: normalizeScheduleWhitespace(dateStr),
    time: normalizeScheduleWhitespace(tr != null ? String(tr).trim() : ''),
  };
}

export const firestoreService = {
  // Mood Logs
  async createMoodLog(moodData: Omit<MoodData, 'user_id'>, userId: string) {
    try {
      const docData = {
        ...moodData,
        user_id: userId,
        log_date: Timestamp.fromDate(moodData.log_date),
        created_at: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'mood_logs'), docData);
      console.log('✅ Mood log created with ID:', docRef.id);
      return { id: docRef.id, ...docData };
    } catch (error: any) {
      console.error('❌ Error creating mood log:', error);
      throw error;
    }
  },

  async getMoodLogs(userId: string, startDate?: Date, endDate?: Date) {
    try {
      let q = query(
        collection(db, 'mood_logs'),
        where('user_id', '==', userId),
        orderBy('log_date', 'desc')
      );

      // Add date filters if provided
      if (startDate) {
        q = query(q, where('log_date', '>=', Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        q = query(q, where('log_date', '<=', Timestamp.fromDate(endDate)));
      }

      const querySnapshot = await getDocs(q);
      const moodLogs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          user_id: data.user_id,
          emotions: data.emotions || [],
          notes: data.notes || '',
          log_date: data.log_date?.toDate() || new Date(),
          energy_level: data.energy_level || 5,
          stress_level: data.stress_level || 3,
          sleep_quality: data.sleep_quality,
          classes_count: data.classes_count,
          exams_count: data.exams_count,
          deadlines_count: data.deadlines_count,
          detection_method: data.detection_method || 'manual',
          created_at: data.created_at?.toDate() || new Date()
        } as MoodData & { id: string; created_at: Date; log_date: Date };
      });

      console.log('✅ Retrieved', moodLogs.length, 'mood logs');
      return moodLogs;
    } catch (error: any) {
      console.error('❌ Error getting mood logs:', error);
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
    onNext: (logs: (MoodData & { id: string; created_at: Date; log_date: Date })[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      let q = query(
        collection(db, 'mood_logs'),
        where('user_id', '==', userId),
        orderBy('log_date', 'desc')
      );
      if (startDate) {
        q = query(q, where('log_date', '>=', Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        q = query(q, where('log_date', '<=', Timestamp.fromDate(endDate)));
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
              notes: data.notes || '',
              log_date: data.log_date?.toDate() || new Date(),
              energy_level: data.energy_level || 5,
              stress_level: data.stress_level || 3,
              sleep_quality: data.sleep_quality,
              classes_count: data.classes_count,
              exams_count: data.exams_count,
              deadlines_count: data.deadlines_count,
              detection_method: data.detection_method || 'manual',
              created_at: data.created_at?.toDate() || new Date(),
            } as MoodData & { id: string; created_at: Date; log_date: Date };
          });
          onNext(moodLogs);
        },
        (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
      );
    } catch (error: any) {
      console.error('❌ subscribeMoodLogs setup error:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      return () => {};
    }
  },

  async updateMoodLog(logId: string, updateData: Partial<MoodData>) {
    try {
      const logRef = doc(db, 'mood_logs', logId);

      const updatePayload: any = {
        ...updateData,
        updated_at: Timestamp.now()
      };

      if (updateData.log_date) {
        updatePayload.log_date = Timestamp.fromDate(updateData.log_date);
      }

      await updateDoc(logRef, updatePayload);
      console.log('✅ Mood log updated');
      return { id: logId, ...updatePayload };
    } catch (error: any) {
      console.error('❌ Error updating mood log:', error);
      throw error;
    }
  },

  // Schedules
  async createSchedule(scheduleData: Omit<ScheduleData, 'user_id'>, userId: string) {
    try {
      const docData = {
        ...scheduleData,
        user_id: userId,
        event_date: Timestamp.fromDate(scheduleData.event_date),
        created_at: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'schedules'), docData);
      console.log('✅ Schedule created with ID:', docRef.id);
      return { id: docRef.id, ...docData };
    } catch (error: any) {
      console.error('❌ Error creating schedule:', error);
      throw error;
    }
  },

  async getSchedules(userId: string, startDate?: Date, endDate?: Date) {
    try {
      let q = query(
        collection(db, 'schedules'),
        where('user_id', '==', userId),
        orderBy('event_date', 'asc')
      );

      if (startDate) {
        q = query(q, where('event_date', '>=', Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        q = query(q, where('event_date', '<=', Timestamp.fromDate(endDate)));
      }

      const querySnapshot = await getDocs(q);
      const schedules = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        event_date: doc.data().event_date.toDate(),
        created_at: doc.data().created_at?.toDate()
      }));

      console.log('✅ Retrieved', schedules.length, 'schedules');
      return schedules;
    } catch (error: any) {
      console.error('❌ Error getting schedules:', error);
      throw error;
    }
  },

  async updateSchedule(scheduleId: string, updateData: Partial<ScheduleData>) {
    try {
      const scheduleRef = doc(db, 'schedules', scheduleId);

      const updatePayload: any = {
        ...updateData,
        updated_at: Timestamp.now()
      };

      if (updateData.event_date) {
        updatePayload.event_date = Timestamp.fromDate(updateData.event_date);
      }

      await updateDoc(scheduleRef, updatePayload);
      console.log('✅ Schedule updated');
      return { id: scheduleId, ...updatePayload };
    } catch (error: any) {
      console.error('❌ Error updating schedule:', error);
      throw error;
    }
  },

  async deleteSchedule(scheduleId: string) {
    try {
      await deleteDoc(doc(db, 'schedules', scheduleId));
      console.log('✅ Schedule deleted');
    } catch (error: any) {
      console.error('❌ Error deleting schedule:', error);
      throw error;
    }
  },

  // Notifications
  async createNotification(notificationData: Omit<NotificationData, 'user_id'>, userId: string) {
    try {
      const docData = {
        ...notificationData,
        user_id: userId,
        scheduled_for: Timestamp.fromDate(notificationData.scheduled_for),
        created_at: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'notifications'), docData);
      console.log('✅ Notification created with ID:', docRef.id);
      return { id: docRef.id, ...docData };
    } catch (error: any) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  },

  async getNotifications(userId: string) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const notifications = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          user_id: data.user_id,
          type: data.type,
          message: data.message,
          status: data.status,
          scheduled_for: data.scheduled_for?.toDate() || new Date(),
          created_at: data.created_at?.toDate() || new Date()
        } as NotificationData & { id: string; created_at: Date };
      });

      console.log('✅ Retrieved', notifications.length, 'notifications');
      return notifications;
    } catch (error: any) {
      console.error('❌ Error getting notifications:', error);
      throw error;
    }
  },

  // Users (for admin counselor management)
  async getUsersByRole(role: 'counselor' | 'student' | 'admin') {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', role)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Record<string, any>));
    } catch (error: any) {
      console.error('❌ Error fetching users by role:', error);
      throw error;
    }
  },

  async markNotificationAsRead(notificationId: string) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        status: 'read',
        updated_at: Timestamp.now()
      });
      console.log('✅ Notification marked as read');
    } catch (error: any) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  },

  // ─── Messaging (conversation-based, one-to-one counselor-student) ─────────────
  // conversations/{conversationId}: counselorId, studentId, lastMessage, lastMessageAt, lastSenderId, unreadCountCounselor, unreadCountStudent, createdAt
  // conversations/{conversationId}/messages/{messageId}: senderId, content, type, sessionId, sessionData, isRead, readAt, isUrgent, createdAt

  async addConversation(counselorId: string, studentData: {
    id: string;
    name: string;
    avatar: string;
    program?: string;
    isAlerted?: boolean;
    borderColor?: string;
  }, counselorData?: { name: string; avatar?: string }) {
    try {
      const conversationId = `${counselorId}_${studentData.id}`;
      const convRef = doc(db, 'conversations', conversationId);
      const existing = await getDoc(convRef);
      if (existing.exists()) return conversationId;

      const docData: Record<string, any> = {
        counselorId,
        studentId: studentData.id,
        lastMessage: '',
        lastMessageAt: Timestamp.now(),
        lastSenderId: null,
        unreadCountCounselor: 0,
        unreadCountStudent: 0,
        createdAt: Timestamp.now(),
        student_name: studentData.name,
        student_avatar: studentData.avatar,
        student_program: studentData.program ?? '',
        is_alerted: studentData.isAlerted ?? false,
        border_color: studentData.borderColor ?? null,
      };
      if (counselorData) {
        docData.counselor_name = counselorData.name;
        docData.counselor_avatar = counselorData.avatar ?? '';
      }
      await setDoc(convRef, docData);
      return conversationId;
    } catch (error: any) {
      console.error('❌ Error adding conversation:', error);
      throw error;
    }
  },

  async getConversations(counselorId: string) {
    const isPlaceholderAvatar = (url: string) =>
      !url || /pravatar|ui-avatars|placeholder\.com|dummyimage/i.test(url);

    try {
      const q = query(
        collection(db, 'conversations'),
        where('counselorId', '==', counselorId),
        orderBy('lastMessageAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const results = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data();
        let avatar = data.student_avatar ?? '';
        if ((!avatar || isPlaceholderAvatar(avatar)) && data.studentId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.studentId));
            const userAvatar = userDoc.data()?.avatar_url ?? '';
            if (userAvatar && !isPlaceholderAvatar(userAvatar)) {
              avatar = userAvatar;
              if (isPlaceholderAvatar(data.student_avatar ?? '')) {
                updateDoc(doc(db, 'conversations', d.id), { student_avatar: userAvatar }).catch(() => {});
              }
            }
          } catch { /* keep existing */ }
        }
        if (isPlaceholderAvatar(avatar)) avatar = '';
        return {
          id: data.studentId,
          conversationId: d.id,
          name: data.student_name,
          preview: data.lastMessage ?? 'No messages yet',
          time: data.lastMessageAt?.toDate ? formatMessageTime(data.lastMessageAt.toDate()) : 'Just now',
          avatar,
          isOnline: false,
          isUnread: (data.unreadCountCounselor ?? 0) > 0,
          isAlerted: data.is_alerted ?? false,
          borderColor: data.border_color ?? undefined,
          program: data.student_program ?? undefined,
          studentId: data.studentId,
        };
      }));
      return results;
    } catch (error: any) {
      console.error('❌ Error getting conversations:', error);
      throw error;
    }
  },

  async getConversationsForStudent(studentId: string) {
    const isPlaceholderAvatar = (url: string) =>
      !url || /pravatar|ui-avatars|placeholder\.com|dummyimage/i.test(url);

    try {
      const q = query(
        collection(db, 'conversations'),
        where('studentId', '==', studentId),
        orderBy('lastMessageAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const results = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data();
        let avatar = data.counselor_avatar ?? '';
        if ((!avatar || isPlaceholderAvatar(avatar)) && data.counselorId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.counselorId));
            const userAvatar = userDoc.data()?.avatar_url ?? '';
            if (userAvatar && !isPlaceholderAvatar(userAvatar)) {
              avatar = userAvatar;
              if (isPlaceholderAvatar(data.counselor_avatar ?? '')) {
                updateDoc(doc(db, 'conversations', d.id), { counselor_avatar: userAvatar }).catch(() => {});
              }
            }
          } catch { /* keep existing */ }
        }
        if (isPlaceholderAvatar(avatar)) avatar = '';
        return {
          id: data.counselorId,
          conversationId: d.id,
          name: data.counselor_name ?? 'Counselor',
          preview: data.lastMessage ?? 'No messages yet',
          time: data.lastMessageAt?.toDate ? formatMessageTime(data.lastMessageAt.toDate()) : 'Just now',
          avatar,
          isOnline: false,
          isUnread: (data.unreadCountStudent ?? 0) > 0,
        };
      }));
      return results;
    } catch (error: any) {
      console.error('❌ Error getting student conversations:', error);
      throw error;
    }
  },

  async getMessages(conversationId: string, counselorId: string) {
    return this._getMessages(conversationId, counselorId, 'counselor');
  },

  async getMessagesForStudent(conversationId: string, studentId: string) {
    return this._getMessages(conversationId, studentId, 'student');
  },

  async _getMessages(
    conversationId: string,
    userId: string,
    _role: 'counselor' | 'student'
  ) {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      return await buildChatMessagesFromQuerySnapshot(snapshot, userId);
    } catch (error: any) {
      console.error('❌ Error getting messages:', error);
      throw error;
    }
  },

  /**
   * Real-time thread messages (student + counselor UIs).
   */
  subscribeConversationMessages(
    conversationId: string,
    userId: string,
    onNext: (messages: unknown[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    let generation = 0;
    return onSnapshot(
      q,
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
      (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
    );
  },

  async sendTextMessage(conversationId: string, senderId: string, text: string) {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const docRef = await addDoc(messagesRef, {
        senderId,
        content: text,
        type: 'chat',
        sessionId: null,
        isRead: false,
        readAt: null,
        isUrgent: false,
        createdAt: Timestamp.now(),
      });
      const convRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(convRef);
      const conv = convSnap.data();
      const isCounselor = conv?.counselorId === senderId;
      const updatePayload: Record<string, any> = {
        lastMessage: text.length > 80 ? text.slice(0, 80) + '...' : text,
        lastMessageAt: Timestamp.now(),
        lastSenderId: senderId,
      };
      if (isCounselor) updatePayload.unreadCountStudent = (conv?.unreadCountStudent ?? 0) + 1;
      else updatePayload.unreadCountCounselor = (conv?.unreadCountCounselor ?? 0) + 1;
      await updateDoc(convRef, updatePayload);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  },

  async sendSessionMessage(conversationId: string, senderId: string, session: Record<string, any>) {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const sidFromId = session?.id != null ? String(session.id).trim() : '';
      const sidFromField = session?.sessionId != null ? String(session.sessionId).trim() : '';
      const linkedSessionId = sidFromId || sidFromField || null;
      const sessionData =
        linkedSessionId != null
          ? { ...session, id: linkedSessionId, sessionId: linkedSessionId }
          : session;
      const docRef = await addDoc(messagesRef, {
        senderId,
        content: `Session: ${session.title ?? 'Appointment'}`,
        type: 'session_invite',
        sessionId: null,
        linkedSessionId,
        sessionData,
        isRead: false,
        readAt: null,
        isUrgent: false,
        createdAt: Timestamp.now(),
      });
      const msgId = docRef.id;
      await updateDoc(doc(db, 'conversations', conversationId, 'messages', msgId), {
        sessionId: msgId,
        linkedSessionId,
      });
      const convRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(convRef);
      const conv = convSnap.data();
      const isCounselor = conv?.counselorId === senderId;
      const updatePayload: Record<string, any> = {
        lastMessage: `Session: ${session.title ?? 'Appointment'}`,
        lastMessageAt: Timestamp.now(),
        lastSenderId: senderId,
      };
      if (isCounselor) updatePayload.unreadCountStudent = (conv?.unreadCountStudent ?? 0) + 1;
      else updatePayload.unreadCountCounselor = (conv?.unreadCountCounselor ?? 0) + 1;
      await updateDoc(convRef, updatePayload);
      return msgId;
    } catch (error: any) {
      console.error('❌ Error sending session message:', error);
      throw error;
    }
  },

  /**
   * Deletes a single conversation message card (chat-only).
   * This should NOT delete/modify the canonical `sessions` docs.
   */
  async deleteConversationMessage(conversationId: string, messageId: string) {
    try {
      await deleteDoc(doc(db, 'conversations', conversationId, 'messages', messageId));
    } catch (error: any) {
      console.error('❌ Error deleting conversation message:', error);
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
    session: Record<string, any>
  ) {
    try {
      const linkedSessionId =
        session?.id != null
          ? String(session.id).trim()
          : session?.sessionId != null
            ? String(session.sessionId).trim()
            : '';

      const sessionData =
        linkedSessionId ? { ...session, id: linkedSessionId, sessionId: linkedSessionId } : session;

      await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
        sessionId: messageId, // match sendSessionMessage behavior
        linkedSessionId: linkedSessionId || null,
        sessionData,
        content: `Session: ${session.title ?? 'Appointment'}`,
      });

      // Update conversation preview/time, but do NOT bump unread counters.
      const convRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(convRef);
      const conv = convSnap.data();
      const isCounselor = conv?.counselorId === senderId;
      void isCounselor;

      await updateDoc(convRef, {
        lastMessage: `Session: ${session.title ?? 'Appointment'}`,
        lastMessageAt: Timestamp.now(),
        lastSenderId: senderId,
      });

      return messageId;
    } catch (error: any) {
      console.error('❌ Error updating session invite message:', error);
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
    session: Record<string, any>
  ) {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const snapshot = await getDocs(query(messagesRef, where('linkedSessionId', '==', sessionId)));

      const sessionInviteDocs = snapshot.docs.filter((d) => {
        const data = d.data() as any;
        return data.type === 'session_invite' && data.senderId === senderId;
      });

      if (sessionInviteDocs.length === 0) {
        return await this.sendSessionMessage(conversationId, senderId, session);
      }

      const toMs = (v: any): number => {
        if (!v) return 0;
        if (typeof v?.toMillis === 'function') return v.toMillis();
        if (typeof v?.seconds === 'number') return v.seconds * 1000;
        if (typeof v === 'number') return v;
        return 0;
      };

      const keepDoc = sessionInviteDocs
        .slice()
        .sort((a, b) => toMs((b.data() as any).createdAt) - toMs((a.data() as any).createdAt))[0];

      const keepMessageId = keepDoc.id;

      // Remove duplicates so the conversation doesn't get flooded.
      await Promise.all(
        sessionInviteDocs
          .filter((d) => d.id !== keepMessageId)
          .map((d) => deleteDoc(doc(db, 'conversations', conversationId, 'messages', d.id)))
      );

      await this.updateSessionInviteMessage(conversationId, keepMessageId, senderId, session);
      return keepMessageId;
    } catch (error: any) {
      console.error('❌ Error updating session invite message schedule:', error);
      throw error;
    }
  },

  async sendSessionRequest(
    conversationId: string,
    studentId: string,
    preferredDate: Date,
    note: string
  ) {
    try {
      const [counselorId] = conversationId.split('_');
      const preferredTimeStr = preferredDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const sessionId = await this.createSessionRequest(
        studentId,
        counselorId,
        note,
        { preferredTime: preferredTimeStr }
      );
      const msgId = await this.addSessionRequestToConversation(
        counselorId,
        studentId,
        sessionId,
        note,
        { preferredTime: preferredTimeStr }
      );
      return msgId;
    } catch (error: any) {
      console.error('❌ Error sending session request:', error);
      throw error;
    }
  },

  // ─── Sessions (counseling appointments) ─────────────────────────────────────
  // sessions/{sessionId}: counselorId, studentId, riskFlagId, initiatedBy, studentRequestNote,
  //   finalSlot (agreed date+time — single source for history badges & overdue; set when either party confirms),
  //   proposedSlots, confirmedSlot (kept in sync with finalSlot when agreed), status, attendanceNote, cancelReason,
  //   reminderSent, createdAt, updatedAt, expiredAt, schedulingOverdueAt, sessionHistoryBadge
  // status: requested | pending | confirmed | needs_rescheduling | expired | completed | missed | rescheduled | cancelled

  async createSessionRequest(
    studentId: string,
    counselorId: string,
    studentRequestNote: string,
    opts?: { preferredTime?: string }
  ) {
    try {
      const docData: Record<string, any> = {
        counselorId,
        studentId,
        riskFlagId: null,
        initiatedBy: 'student',
        studentRequestNote: studentRequestNote.trim(),
        proposedSlots: [],
        confirmedSlot: null,
        finalSlot: null,
        status: 'requested',
        attendanceNote: null,
        cancelReason: null,
        reminderSent: false,
        sessionHistoryBadge: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      if (opts?.preferredTime) {
        docData.preferredTimeFromStudent = opts.preferredTime;
      }
      const docRef = await addDoc(collection(db, 'sessions'), docData);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Error creating session request:', error);
      throw error;
    }
  },

  /**
   * Counselor-initiated invite: creates `sessions/{id}` with proposed slots so the student can
   * confirm via `studentConfirmFinalSlot` using this document id (not a client `session_*` placeholder).
   */
  async createCounselorSessionInvite(
    counselorId: string,
    studentId: string,
    proposedSlots: Array<{ date: string; time: string }>,
    opts?: { note?: string }
  ) {
    try {
      const docData: Record<string, any> = {
        counselorId,
        studentId,
        riskFlagId: null,
        initiatedBy: 'counselor',
        studentRequestNote: (opts?.note ?? '').trim(),
        proposedSlots,
        confirmedSlot: null,
        finalSlot: null,
        status: 'pending',
        attendanceNote: null,
        cancelReason: null,
        reminderSent: false,
        sessionHistoryBadge: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, 'sessions'), docData);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Error creating counselor session invite:', error);
      throw error;
    }
  },

  async addSessionRequestToConversation(
    counselorId: string,
    studentId: string,
    sessionId: string,
    note: string,
    opts?: {
      preferredTime?: string;
      studentData?: { name: string; avatar: string };
      counselorData?: { name: string; avatar?: string };
    }
  ) {
    try {
      const conversationId = `${counselorId}_${studentId}`;
      if (opts?.studentData) {
        await this.addConversation(counselorId, {
          id: studentId,
          name: opts.studentData.name,
          avatar: opts.studentData.avatar,
        }, opts.counselorData);
      }
      const preferredTimeStr = opts?.preferredTime ?? '';
      const sessionData = {
        sessionId,
        preferredTime: preferredTimeStr || undefined,
        note: note.trim(),
        status: 'requested',
      };
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const docRef = await addDoc(messagesRef, {
        senderId: studentId,
        content: preferredTimeStr ? `Session request: ${preferredTimeStr}` : 'Session request',
        type: 'session_request',
        sessionId,
        sessionData,
        isRead: false,
        readAt: null,
        isUrgent: false,
        createdAt: Timestamp.now(),
      });
      const convRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(convRef);
      const conv = convSnap.data();
      await updateDoc(convRef, {
        lastMessage: preferredTimeStr ? `Session request: ${preferredTimeStr}` : 'Session request',
        lastMessageAt: Timestamp.now(),
        lastSenderId: studentId,
        unreadCountCounselor: (conv?.unreadCountCounselor ?? 0) + 1,
      });
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Error adding session request to conversation:', error);
      throw error;
    }
  },

  async getSessionsForStudent(studentId: string) {
    try {
      const q = query(
        collection(db, 'sessions'),
        where('studentId', '==', studentId),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error: any) {
      console.error('❌ Error getting student sessions:', error);
      throw error;
    }
  },

  async getSessionsForCounselor(counselorId: string) {
    try {
      const q = query(
        collection(db, 'sessions'),
        where('counselorId', '==', counselorId),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error: any) {
      console.error('❌ Error getting counselor sessions:', error);
      throw error;
    }
  },

  async proposeSlots(sessionId: string, slots: Array<{ date: string; time: string }>) {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        proposedSlots: slots,
        finalSlot: null,
        confirmedSlot: null,
        status: 'pending',
        updatedAt: Timestamp.now(),
      });
    } catch (error: any) {
      console.error('❌ Error proposing slots:', error);
      throw error;
    }
  },

  async confirmSlot(sessionId: string, slot: { date: string; time: string }) {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        finalSlot: slot,
        confirmedSlot: slot,
        status: 'confirmed',
        updatedAt: Timestamp.now(),
      });
    } catch (error: any) {
      console.error('❌ Error confirming slot:', error);
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
    opts?: { conversationId?: string; counselorId?: string }
  ) {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const snap = await getDoc(sessionRef);
      if (!snap.exists()) throw new Error('Session not found');
      const data = snap.data()!;
      const uid = String(studentId);

      let authorized = data.studentId != null && String(data.studentId) === uid;

      if (
        !authorized &&
        data.studentId == null &&
        opts?.conversationId &&
        opts?.counselorId
      ) {
        const convSnap = await getDoc(doc(db, 'conversations', opts.conversationId));
        const conv = convSnap.data();
        const counselorOk = String(data.counselorId ?? '') === String(opts.counselorId);
        const studentOk = conv != null && String(conv.studentId ?? '') === uid;
        if (counselorOk && studentOk) {
          authorized = true;
        }
      }

      if (!authorized) throw new Error('Not authorized');

      const patch: Record<string, unknown> = {
        finalSlot: slot,
        confirmedSlot: slot,
        status: 'confirmed',
        updatedAt: Timestamp.now(),
      };
      if (data.studentId == null) {
        patch.studentId = uid;
      }
      await updateDoc(sessionRef, patch as any);
    } catch (error: any) {
      console.error('❌ Error confirming final slot:', error);
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
    status: 'confirmed' | 'cancelled'
  ) {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const snapshot = await getDocs(query(messagesRef, orderBy('createdAt', 'asc')));
      const updates: Promise<void>[] = [];
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.type === 'session_request' && (data.sessionId === sessionId || data.sessionData?.sessionId === sessionId)) {
          const existingSessionData = data.sessionData ?? {};
          updates.push(
            updateDoc(doc(db, 'conversations', conversationId, 'messages', d.id), {
              sessionData: { ...existingSessionData, status },
            })
          );
        }
      });
      await Promise.all(updates);
    } catch (error: any) {
      console.error('❌ Error updating session request message status:', error);
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
    note: string
  ) {
    try {
      const trimmedNote = (note ?? '').trim();
      const content = preferredTime ? `Session request: ${preferredTime}` : 'Session request';

      // Update the canonical session doc.
      await updateDoc(doc(db, 'sessions', sessionId), {
        preferredTimeFromStudent: preferredTime,
        studentRequestNote: trimmedNote,
        status: 'requested',
        updatedAt: Timestamp.now(),
      });

      // Update the existing chat message card.
      const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      const msgSnap = await getDoc(msgRef);
      const existing = msgSnap.data();
      const existingSessionData = (existing?.sessionData ?? {}) as Record<string, any>;

      await updateDoc(msgRef, {
        content,
        sessionData: {
          ...existingSessionData,
          sessionId,
          preferredTime: preferredTime || undefined,
          note: trimmedNote,
          status: 'requested',
        },
      });

      // Update conversation preview/last message without changing unread counters.
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        lastMessage: content,
        lastMessageAt: Timestamp.now(),
        lastSenderId: senderId,
      });
    } catch (error: any) {
      console.error('❌ Error updating session request schedule:', error);
      throw error;
    }
  },

  /**
   * Deletes `sessions` docs that have been `expired` for more than 7 days (counselor scope).
   */
  async purgeExpiredSessionsPastRetention(counselorId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'sessions'),
        where('counselorId', '==', counselorId),
        where('status', '==', 'expired')
      );
      const snapshot = await getDocs(q);
      const cutoff = Date.now() - EXPIRED_SESSION_RETENTION_MS;
      const deletes = snapshot.docs
        .filter((d) => {
          const ea = d.data().expiredAt?.toMillis?.();
          return typeof ea === 'number' && ea < cutoff;
        })
        .map((d) => deleteDoc(doc(db, 'sessions', d.id)));
      await Promise.all(deletes);
    } catch (e) {
      console.error('❌ Error purging expired sessions:', e);
    }
  },

  async markSessionAttendance(
    sessionId: string,
    outcome: 'completed' | 'missed' | 'rescheduled',
    attendanceNote?: string
  ) {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const badge: SessionHistoryBadge =
        outcome === 'completed' ? 'completed' : outcome === 'missed' ? 'missed' : 'pending';
      await updateDoc(sessionRef, {
        status: outcome,
        attendanceNote: attendanceNote ?? null,
        updatedAt: Timestamp.now(),
        expiredAt: null,
        schedulingOverdueAt: null,
        sessionHistoryBadge: badge,
        ...(outcome === 'rescheduled' ? { finalSlot: null, confirmedSlot: null } : {}),
      });
    } catch (error: any) {
      console.error('❌ Error marking attendance:', error);
      throw error;
    }
  },

  /**
   * Get session history for counselor with enriched student data (name, program).
   * Only returns sessions with confirmedSlot (accepted) or completed/missed/rescheduled status.
   */
  async getSessionHistoryForCounselor(counselorId: string): Promise<Array<{
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
  }>> {
    try {
      await this.purgeExpiredSessionsPastRetention(counselorId);

      const q = query(
        collection(db, 'sessions'),
        where('counselorId', '==', counselorId),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map((d) => {
        const data = d.data();
        const rawProposed = Array.isArray(data.proposedSlots) ? data.proposedSlots : [];
        const proposedSlots = rawProposed
          .map(
            (p: unknown) => normalizeFirestoreSessionSlot(p) ?? looseSessionSlotFromRaw(p)
          )
          .filter((x): x is { date: string; time: string } => x != null);
        const finalSlot =
          normalizeFirestoreSessionSlot(data.finalSlot) ?? looseSessionSlotFromRaw(data.finalSlot);
        const confirmedSlot =
          normalizeFirestoreSessionSlot(data.confirmedSlot) ?? looseSessionSlotFromRaw(data.confirmedSlot);
        return {
          id: d.id,
          studentId: data.studentId,
          status: data.status ?? 'requested',
          finalSlot,
          confirmedSlot,
          proposedSlots,
          preferredTimeFromStudent: data.preferredTimeFromStudent,
          studentRequestNote: data.studentRequestNote,
          attendanceNote: data.attendanceNote,
          cancelReason: data.cancelReason,
          sessionHistoryBadge: data.sessionHistoryBadge as SessionHistoryBadge | undefined,
          updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
        };
      });

      // Enrich with student data
      const uniqueStudentIds = [...new Set(sessions.map((s) => s.studentId))];
      const userPromises = uniqueStudentIds.map((id) => getDoc(doc(db, 'users', id)));
      const userSnaps = await Promise.all(userPromises);
      const userMap: Record<string, { full_name?: string; department?: string; program?: string; year?: string; avatar_url?: string }> = {};
      userSnaps.forEach((snap, i) => {
        const uid = uniqueStudentIds[i];
        const u = snap.data();
        userMap[uid] = {
          full_name: u?.full_name ?? u?.fullName,
          department: u?.department,
          program: u?.program,
          year: u?.year ?? u?.year_level,
          avatar_url: u?.avatar_url,
        };
      });

      const syncSchedulingStatus = async (s: (typeof sessions)[0]): Promise<string> => {
        let status = s.status;
        const terminal = ['completed', 'missed', 'cancelled', 'rescheduled'];
        if (terminal.includes(status)) return status;

        const scheduled = getSessionScheduledDate({
          finalSlot: s.finalSlot,
          confirmedSlot: s.confirmedSlot,
          proposedSlots: s.proposedSlots,
          preferredTimeFromStudent: s.preferredTimeFromStudent,
        });
        if (!scheduled) return status;

        const overdue = getOverdueSchedulingState(scheduled);
        if (overdue === 'none') return status;

        try {
          if (overdue === 'expired') {
            if (status !== 'expired') {
              await updateDoc(doc(db, 'sessions', s.id), {
                status: 'expired',
                expiredAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
            }
            return 'expired';
          }
          if (overdue === 'needs_rescheduling') {
            if (['confirmed', 'pending', 'requested'].includes(status)) {
              await updateDoc(doc(db, 'sessions', s.id), {
                status: 'needs_rescheduling',
                schedulingOverdueAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
              return 'needs_rescheduling';
            }
            if (status === 'needs_rescheduling') return status;
          }
        } catch {
          // ignore failed writes
        }
        return status;
      };

      const results = await Promise.all(
        sessions.map(async (s) => {
          const status = await syncSchedulingStatus(s);
          const merged = { ...s, status };
          const badge = computeSessionHistoryBadge(merged);
          if (badge !== s.sessionHistoryBadge) {
            try {
              await updateDoc(doc(db, 'sessions', s.id), { sessionHistoryBadge: badge });
            } catch {
              /* ignore */
            }
          }
          return {
            ...merged,
            sessionHistoryBadge: badge,
            studentName: userMap[s.studentId]?.full_name ?? 'Unknown Student',
            studentAvatar: userMap[s.studentId]?.avatar_url,
            studentDepartment: userMap[s.studentId]?.department,
            studentProgram: userMap[s.studentId]?.program,
            studentYear: userMap[s.studentId]?.year,
          };
        })
      );

      return results;
    } catch (error: any) {
      console.error('❌ Error getting session history:', error);
      throw error;
    }
  },
};

async function buildChatMessagesFromQuerySnapshot(snapshot: QuerySnapshot, userId: string) {
  const msgs = snapshot.docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt?.toDate?.() ?? new Date();
    const isMe = data.senderId === userId;
    const senderId = isMe ? 'me' : 'them';
    if (data.type === 'session_invite') {
      const rawSession = (data.sessionData ?? data.session ?? {}) as Record<string, unknown>;
      const resolved = resolveSessionsDocIdFromInviteMessageData(data as Record<string, unknown>);
      const fallbackNested =
        (rawSession.id != null && String(rawSession.id).trim()) ||
        (rawSession.sessionId != null && String(rawSession.sessionId).trim()) ||
        '';
      const id = (resolved || fallbackNested || '').trim();
      const sessionForCard = {
        ...rawSession,
        id,
        ...(id && !isPlaceholderSessionDocId(id) ? { linkedSessionId: id, sessionId: id } : {}),
      };
      return {
        id: d.id,
        senderId,
        type: 'session' as const,
        session: sessionForCard,
        time: formatMessageTime(createdAt),
      };
    }
    if (data.type === 'session_request') {
      const req = data.sessionData ?? {};
      const sid = data.sessionId ?? req.sessionId ?? null;
      return {
        id: d.id,
        senderId,
        type: 'session_request' as const,
        sessionRequest: {
          id: d.id,
          sessionId: sid,
          preferredTime: req.preferredTime ?? '',
          note: req.note ?? '',
          status: req.status ?? 'pending',
        },
        time: formatMessageTime(createdAt),
      };
    }
    return {
      id: d.id,
      senderId,
      type: 'text' as const,
      text: data.content ?? '',
      time: formatMessageTime(createdAt),
    };
  });

  const sessionRequestMsgs = msgs.filter((m) => m.type === 'session_request');
  const sessionInviteMsgs = msgs.filter((m) => m.type === 'session');
  const requestSessionIds = [...new Set(sessionRequestMsgs.map((m) => m.sessionRequest.sessionId).filter(Boolean))] as string[];
  const inviteSessionIds = [...new Set(
    sessionInviteMsgs
      .map((m) => resolveSessionsDocIdForSessionCard(m.session as Record<string, unknown>))
      .filter(Boolean)
  )] as string[];
  const allSessionIds = [...new Set([...requestSessionIds, ...inviteSessionIds])];

  let sessionStatusMap: Record<string, string> = {};
  let sessionFinalSlotMap: Record<string, { date: string; time: string } | null> = {};
  if (allSessionIds.length > 0) {
    const sessionPromises = allSessionIds.map((id) => getDoc(doc(db, 'sessions', id)));
    const sessionSnaps = await Promise.all(sessionPromises);
    sessionSnaps.forEach((snap, i) => {
      const sid = allSessionIds[i];
      const s = snap.data();
      if (s?.status) sessionStatusMap[sid] = s.status;
      const fs = s?.finalSlot ?? s?.confirmedSlot;
      if (fs && typeof fs === 'object' && 'date' in fs && 'time' in fs) {
        sessionFinalSlotMap[sid] = { date: String(fs.date), time: String(fs.time) };
      } else {
        sessionFinalSlotMap[sid] = null;
      }
    });
  }

  return msgs.map((m) => {
    if (m.type === 'session_request' && m.sessionRequest.sessionId) {
      const sessionStatus = sessionStatusMap[m.sessionRequest.sessionId];
      if (
        sessionStatus &&
        ['confirmed', 'completed', 'missed', 'rescheduled', 'cancelled', 'needs_rescheduling', 'expired'].includes(
          sessionStatus
        )
      ) {
        return {
          ...m,
          sessionRequest: { ...m.sessionRequest, status: sessionStatus },
        };
      }
    }
    if (m.type === 'session') {
      const sid = resolveSessionsDocIdForSessionCard(m.session as Record<string, unknown>);
      if (sid && sessionStatusMap[sid]) {
        const fs = sessionFinalSlotMap[sid];
        return {
          ...m,
          session: {
            ...m.session,
            id: sid,
            linkedSessionId: sid,
            sessionId: sid,
            sessionStatus: sessionStatusMap[sid],
            ...(fs ? { agreedSlot: fs } : {}),
          },
        };
      }
    }
    return m;
  });
}

function formatMessageTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}