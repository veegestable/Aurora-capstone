// Firebase Firestore Service for Aurora Mood Tracking
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

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
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduled_for: doc.data().scheduled_for.toDate(),
        created_at: doc.data().created_at.toDate()
      }));

      console.log('✅ Retrieved', notifications.length, 'notifications');
      return notifications;
    } catch (error: any) {
      console.error('❌ Error getting notifications:', error);
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
  }
};