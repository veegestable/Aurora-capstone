import { useEffect, useState } from 'react';
import { notificationService } from '../services/notification.service';

export function useNotifications(userId: string) {
    const [notifications, setNotifications] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const data = await notificationService.getNotifications(userId);
                if (mounted) setNotifications(Array.isArray(data) ? data : []);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [userId]);

    return { notifications, loading };
}
