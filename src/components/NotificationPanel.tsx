import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, MessageCircle, Calendar, Smile } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notification';

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
        return <Smile className="w-5 h-5 text-[#22C55E]" />;
      case 'event_reminder':
        return <Calendar className="w-5 h-5 text-[#F97316]" />;
      case 'counselor_message':
        return <MessageCircle className="w-5 h-5 text-[#2D6BFF]" />;
      default:
        return <Bell className="w-5 h-5 text-[#7B8EC8]" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'mood_reminder':
        return 'bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.2)]';
      case 'event_reminder':
        return 'bg-[rgba(249,115,22,0.08)] border-[rgba(249,115,22,0.2)]';
      case 'counselor_message':
        return 'bg-[rgba(45,107,255,0.08)] border-[rgba(45,107,255,0.2)]';
      default:
        return 'bg-white/3 border-white/8';
    }
  };

  const unreadNotifications = notifications.filter(n => n.status !== 'read');
  const readNotifications = notifications.filter(n => n.status === 'read');

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        {unreadCount > 0 ? (
          <Bell className="w-6 h-6 text-[#7B8EC8]" />
        ) : (
          <BellOff className="w-6 h-6 text-[#4B5693]" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#EF4444] text-white text-xs rounded-full flex items-center justify-center font-semibold">
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
          <div className="absolute right-0 mt-2 w-96 max-h-128 overflow-y-auto bg-[#0B0D30] rounded-xl shadow-2xl border border-white/8 z-50">
            <div className="sticky top-0 bg-[#0B0D30] border-b border-white/8 p-4">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <p className="text-sm text-[#7B8EC8] mt-1">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>

            <div className="p-2">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <BellOff className="w-12 h-12 text-[#4B5693] mx-auto mb-3" />
                  <p className="text-[#7B8EC8]">No notifications yet</p>
                </div>
              ) : (
                <>
                  {unreadNotifications.length > 0 && (
                    <div className="mb-2">
                      <h4 className="text-xs font-semibold text-[#4B5693] uppercase tracking-wide px-2 mb-2">
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
                                <p className="text-sm text-white mb-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-[#7B8EC8]">
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
                                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4 text-[#7B8EC8]" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {readNotifications.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-[#4B5693] uppercase tracking-wide px-2 mb-2 mt-4">
                        Earlier
                      </h4>
                      <div className="space-y-2 opacity-60">
                        {readNotifications.slice(0, 5).map((notification) => (
                          <div
                            key={notification.id}
                            className="p-3 rounded-lg bg-white/3 border border-white/8"
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#7B8EC8] mb-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-[#4B5693]">
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
