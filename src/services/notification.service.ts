export interface NotificationData {
  title: string;
  message: string;
  type: 'reminder' | 'alert' | 'info';
  scheduled_for: string;
}

import { firestoreService } from './firebase-firestore.service';
import { Timestamp } from 'firebase/firestore';

export interface Notification {
  id: string;
  type: 'mood_reminder' | 'event_reminder' | 'counselor_message';
  message: string;
  status: 'pending' | 'sent' | 'read';
  scheduled_for: string;
  created_at: string;
}

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const notifications = await firestoreService.getNotifications(userId);
      return notifications.map(n => {
        // Handle Firestore Timestamp
        const scheduledFor = n.scheduled_for instanceof Timestamp ? n.scheduled_for.toDate() : new Date(n.scheduled_for);
        const createdAt = n.created_at instanceof Timestamp ? n.created_at.toDate() : new Date(n.created_at);

        return {
          id: n.id,
          type: n.type,
          message: n.message,
          status: n.status,
          scheduled_for: scheduledFor.toISOString(),
          created_at: createdAt.toISOString()
        };
      }) as Notification[];
    } catch (error) {
      console.error('Get notifications error:', error);
      return [];
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const notifications = await firestoreService.getNotifications(userId);
      return notifications.filter(n => n.status !== 'read').length;
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0;
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await firestoreService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  },

  async createNotification(data: {
    userId: string;
    type: 'mood_reminder' | 'event_reminder' | 'counselor_message';
    message: string;
    scheduled_for: string;
  }): Promise<Notification> {
    try {
      const result = await firestoreService.createNotification({
        type: data.type,
        message: data.message,
        status: 'pending',
        scheduled_for: new Date(data.scheduled_for)
      }, data.userId);

      const scheduledFor = result.scheduled_for instanceof Timestamp ? result.scheduled_for.toDate() : new Date(result.scheduled_for);
      const createdAt = result.created_at instanceof Timestamp ? result.created_at.toDate() : new Date(result.created_at);

      return {
        id: result.id,
        type: result.type,
        message: result.message,
        status: result.status,
        scheduled_for: scheduledFor.toISOString(),
        created_at: createdAt.toISOString()
      } as Notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }
};
