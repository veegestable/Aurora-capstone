import { useEffect, useState } from 'react';
import { subscribeToUsersPresence } from '../services/firebase-presence.service';

/** Live online flag for a single peer (counselor or student uid). */
export function usePeerPresence(peerUserId: string | null | undefined): boolean {
    const [online, setOnline] = useState(false);

    useEffect(() => {
        if (!peerUserId) {
            setOnline(false);
            return;
        }
        return subscribeToUsersPresence([peerUserId], (map) => {
            setOnline(map[peerUserId] === true);
        });
    }, [peerUserId]);

    return online;
}
