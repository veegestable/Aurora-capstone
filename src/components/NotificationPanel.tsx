import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, MessageCircle, Calendar, Smile } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notification.service';

interface Notification {
  id: string;
  type: 'mood_reminder' | 'event_reminder' | 'counselor_message';
  message: string;
  status: 'pending' | 'sent' | 'read';
  scheduled_for: string;
  created_at: string;
}

export default function NotificationPanel() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    const data = await notificationService.getNotifications(user.id);
    setNotifications(data);
  };

  const loadUnreadCount = async () => {
    if (!user) return;
    const count = await notificationService.getUnreadCount(user.id);
    setUnreadCount(count);
  };

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    await loadNotifications();
    await loadUnreadCount();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mood_reminder':
        return <Smile className="w-5 h-5 text-teal-600" />;
      case 'event_reminder':
        return <Calendar className="w-5 h-5 text-orange-600" />;
      case 'counselor_message':
        return <MessageCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'mood_reminder':
        return 'bg-teal-50 border-teal-200';
      case 'event_reminder':
        return 'bg-orange-50 border-orange-200';
      case 'counselor_message':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const unreadNotifications = notifications.filter(n => n.status !== 'read');
  const readNotifications = notifications.filter(n => n.status === 'read');

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {unreadCount > 0 ? (
          <Bell className="w-6 h-6 text-gray-700" />
        ) : (
          <BellOff className="w-6 h-6 text-gray-400" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />
          <div className="absolute right-0 mt-2 w-96 max-h-[32rem] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <p className="text-sm text-gray-600 mt-1">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>

            <div className="p-2">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <BellOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No notifications yet</p>
                </div>
              ) : (
                <>
                  {unreadNotifications.length > 0 && (
                    <div className="mb-2">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2">
                        New
                      </h4>
                      <div className="space-y-2">
                        {unreadNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 rounded-lg border-2 ${getNotificationBgColor(notification.type)}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 mb-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {new Date(notification.scheduled_for).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-1.5 hover:bg-white rounded-lg transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {readNotifications.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2 mt-4">
                        Earlier
                      </h4>
                      <div className="space-y-2 opacity-60">
                        {readNotifications.slice(0, 5).map((notification) => (
                          <div
                            key={notification.id}
                            className="p-3 rounded-lg bg-gray-50 border border-gray-200"
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 mb-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(notification.scheduled_for).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
