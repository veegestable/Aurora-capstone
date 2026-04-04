/**
 * Realtime presence (online / offline) via Firebase Realtime Database.
 *
 * RTDB rules (console → Realtime Database → Rules), for example:
 * {
 *   "rules": {
 *     "presence": {
 *       "$uid": {
 *         ".read": "auth != null",
 *         ".write": "auth != null && auth.uid === $uid"
 *       }
 *     }
 *   }
 * }
 */
import { AppState, type AppStateStatus } from 'react-native';
import { ref, set, onDisconnect, serverTimestamp, onValue } from 'firebase/database';
import { rtdb } from './firebase';

const PRESENCE_PATH = 'presence';

function presenceRef(uid: string) {
    if (!rtdb) return null;
    return ref(rtdb, `${PRESENCE_PATH}/${uid}`);
}

/** True when Realtime Database is configured and initialized. */
export function isPresenceAvailable(): boolean {
    return rtdb !== null;
}

/**
 * Mark current user online, register onDisconnect offline, and sync with app foreground/background.
 * Call once per signed-in user; run the returned cleanup on sign-out or unmount.
 */
export function startMyPresence(uid: string): () => void {
    if (!rtdb) {
        return () => {};
    }

    const userRef = presenceRef(uid);
    if (!userRef) return () => {};

    const goOnline = () => {
        set(userRef, { online: true, lastSeen: serverTimestamp() }).catch(() => {});
        onDisconnect(userRef)
            .set({ online: false, lastSeen: serverTimestamp() })
            .catch(() => {});
    };

    const goOffline = () => {
        set(userRef, { online: false, lastSeen: serverTimestamp() }).catch(() => {});
    };

    goOnline();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
        if (next === 'active') {
            goOnline();
        } else {
            goOffline();
        }
    });

    return () => {
        sub.remove();
        goOffline();
    };
}

/**
 * Subscribe to /presence/{uid}/online for many users. Callback receives the latest map (missing id => offline).
 */
export function subscribeToUsersPresence(
    userIds: string[],
    onUpdate: (onlineById: Record<string, boolean>) => void
): () => void {
    if (!rtdb || userIds.length === 0) {
        onUpdate({});
        return () => {};
    }

    const unique = [...new Set(userIds.filter(Boolean))];
    const onlineById: Record<string, boolean> = {};
    const unsubs: (() => void)[] = [];

    const emit = () => onUpdate({ ...onlineById });

    for (const id of unique) {
        const r = ref(rtdb, `${PRESENCE_PATH}/${id}/online`);
        const unsub = onValue(r, (snap) => {
            onlineById[id] = snap.val() === true;
            emit();
        });
        unsubs.push(unsub);
    }

    return () => {
        unsubs.forEach((u) => u());
    };
}
