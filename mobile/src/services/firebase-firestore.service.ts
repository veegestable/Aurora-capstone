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
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

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
      const msgs = snapshot.docs.map((d) => {
        const data = d.data();
        const createdAt = data.createdAt?.toDate?.() ?? new Date();
        const isMe = data.senderId === userId;
        const senderId = isMe ? 'me' : 'them';
        if (data.type === 'session_invite') {
          const session = data.sessionData ?? data.session ?? {};
          return {
            id: d.id,
            senderId,
            type: 'session' as const,
            session: { ...session, id: data.sessionId ?? d.id },
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
      const sessionIds = [...new Set(sessionRequestMsgs.map((m) => m.sessionRequest.sessionId).filter(Boolean))] as string[];
      let sessionStatusMap: Record<string, string> = {};
      if (sessionIds.length > 0) {
        const sessionPromises = sessionIds.map((id) => getDoc(doc(db, 'sessions', id)));
        const sessionSnaps = await Promise.all(sessionPromises);
        sessionSnaps.forEach((snap, i) => {
          const sid = sessionIds[i];
          const s = snap.data();
          if (s?.status) sessionStatusMap[sid] = s.status;
        });
      }

      return msgs.map((m) => {
        if (m.type === 'session_request' && m.sessionRequest.sessionId) {
          const sessionStatus = sessionStatusMap[m.sessionRequest.sessionId];
          if (sessionStatus && ['confirmed', 'completed', 'missed', 'rescheduled', 'cancelled'].includes(sessionStatus)) {
            return {
              ...m,
              sessionRequest: { ...m.sessionRequest, status: sessionStatus },
            };
          }
        }
        return m;
      });
    } catch (error: any) {
      console.error('❌ Error getting messages:', error);
      throw error;
    }
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
      const docRef = await addDoc(messagesRef, {
        senderId,
        content: `Session: ${session.title ?? 'Appointment'}`,
        type: 'session_invite',
        sessionId: null,
        sessionData: session,
        isRead: false,
        readAt: null,
        isUrgent: false,
        createdAt: Timestamp.now(),
      });
      const msgId = docRef.id;
      await updateDoc(doc(db, 'conversations', conversationId, 'messages', msgId), {
        sessionId: msgId,
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
  //   proposedSlots, confirmedSlot, status, attendanceNote, cancelReason, reminderSent, createdAt, updatedAt
  // status: requested | pending | confirmed | completed | missed | rescheduled | cancelled

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
        status: 'requested',
        attendanceNote: null,
        cancelReason: null,
        reminderSent: false,
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

  async markSessionAttendance(
    sessionId: string,
    outcome: 'completed' | 'missed' | 'rescheduled',
    attendanceNote?: string
  ) {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        status: outcome,
        attendanceNote: attendanceNote ?? null,
        updatedAt: Timestamp.now(),
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
    confirmedSlot: { date: string; time: string } | null;
    proposedSlots: Array<{ date: string; time: string }>;
    preferredTimeFromStudent?: string;
    attendanceNote?: string;
    cancelReason?: string;
    updatedAt: Date;
    createdAt: Date;
  }>> {
    try {
      const q = query(
        collection(db, 'sessions'),
        where('counselorId', '==', counselorId),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          studentId: data.studentId,
          status: data.status ?? 'requested',
          confirmedSlot: data.confirmedSlot ?? null,
          proposedSlots: data.proposedSlots ?? [],
          preferredTimeFromStudent: data.preferredTimeFromStudent,
          attendanceNote: data.attendanceNote,
          cancelReason: data.cancelReason,
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
          department: u?.department ?? u?.program,
          program: u?.department ?? u?.program,
          year: u?.year ?? u?.year_level,
          avatar_url: u?.avatar_url,
        };
      });

      const isSlotPassed = (slot: { date: string; time: string } | null) => {
        if (!slot?.date || !slot?.time) return false;
        try {
          const dateStr = `${slot.date}, ${slot.time}`.replace(/\s+at\s+/i, ', ');
          const parsed = new Date(dateStr);
          return !isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
        } catch {
          return false;
        }
      };

      const isPreferredTimePassed = (preferredTime: string | undefined) => {
        if (!preferredTime?.trim()) return false;
        try {
          const normalized = preferredTime.replace(/\s+at\s+/i, ', ');
          const parsed = new Date(normalized);
          return !isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
        } catch {
          return false;
        }
      };

      const results = await Promise.all(sessions.map(async (s) => {
        let status = s.status;
        const slot = s.confirmedSlot ?? s.proposedSlots?.[0];
        const slotPassed = slot ? isSlotPassed(slot) : isPreferredTimePassed(s.preferredTimeFromStudent);
        if (['confirmed', 'pending', 'requested'].includes(status) && slotPassed) {
          try {
            await updateDoc(doc(db, 'sessions', s.id), {
              status: 'missed',
              updatedAt: Timestamp.now(),
            });
            status = 'missed';
          } catch {
          }
        }
        return {
          ...s,
          status,
          studentName: userMap[s.studentId]?.full_name ?? 'Unknown Student',
          studentAvatar: userMap[s.studentId]?.avatar_url,
          studentProgram: userMap[s.studentId]?.department ?? userMap[s.studentId]?.program,
          studentYear: userMap[s.studentId]?.year,
        };
      }));

      return results;
    } catch (error: any) {
      console.error('❌ Error getting session history:', error);
      throw error;
    }
  },
};

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