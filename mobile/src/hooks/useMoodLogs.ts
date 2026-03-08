import { useEffect, useState } from 'react';
import { moodService } from '../services/mood.service';

export function useMoodLogs(userId: string) {
    const [logs, setLogs] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const data = await moodService.getMoodLogs(userId);
                if (mounted) setLogs(Array.isArray(data) ? data : []);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [userId]);

    return { logs, loading };
}
