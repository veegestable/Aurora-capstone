export interface NotificationData {
  title: string;
  message: string;
  type: 'reminder' | 'alert' | 'info';
  scheduled_for: string;
}

const API_BASE_URL = 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

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
      const response = await fetch(`${API_BASE_URL}/api/notifications?userId=${userId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Get notifications error:', error);
      return []; // Return empty array on error
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count?userId=${userId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.count || 0;
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0; // Return 0 on error
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
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
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }
};
