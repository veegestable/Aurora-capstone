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
import { auth, rtdb } from './firebase';

const PRESENCE_PATH = 'presence';

function presenceRef(uid: string) {
    if (!rtdb) return null;
    return ref(rtdb, `${PRESENCE_PATH}/${uid}`);
}

function logPresenceError(context: string, err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[presence] ${context}:`, msg);
}

/** True when Realtime Database is configured and initialized. */
export function isPresenceAvailable(): boolean {
    return rtdb !== null;
}

/**
 * Set offline while still signed in to Firebase Auth.
 * Must run before `signOut()` — after logout, RTDB rules block writes so the node would stay `online: true`.
 */
export async function setMyPresenceOfflineNow(uid: string): Promise<void> {
    if (!rtdb) return;
    const userRef = presenceRef(uid);
    if (!userRef) return;
    if (auth.currentUser?.uid !== uid) {
        console.warn('[presence] setMyPresenceOfflineNow skipped — auth uid mismatch');
        return;
    }
    try {
        await set(userRef, { online: false, lastSeen: serverTimestamp() });
        if (__DEV__) console.log('[presence] explicit offline before signOut OK');
    } catch (e) {
        logPresenceError('setMyPresenceOfflineNow', e);
        throw e;
    }
}

/**
 * Mark current user online, register onDisconnect offline, and sync with app foreground/background.
 * Call once per signed-in user; run the returned cleanup on sign-out or unmount.
 */
export function startMyPresence(uid: string): () => void {
    if (!rtdb) {
        console.warn('[presence] Realtime Database not initialized — check EXPO_PUBLIC_FIREBASE_DATABASE_URL and restart Expo with --clear');
        return () => {};
    }

    const authUid = auth.currentUser?.uid;
    if (authUid && authUid !== uid) {
        console.warn('[presence] user.id does not match auth.uid — writes may fail. user.id=', uid, 'auth.uid=', authUid);
    }

    const userRef = presenceRef(uid);
    if (!userRef) return () => {};

    let disposed = false;

    /** Register server-side disconnect handler, then set online (Firebase-recommended `.info/connected` flow). */
    const wireOnlineAndOnDisconnect = () => {
        if (disposed || auth.currentUser?.uid !== uid) return;
        onDisconnect(userRef)
            .set({ online: false, lastSeen: serverTimestamp() })
            .then(() => set(userRef, { online: true, lastSeen: serverTimestamp() }))
            .then(() => {
                if (__DEV__) {
                    console.log('[presence] online + onDisconnect registered for', uid.slice(0, 8) + '…');
                }
            })
            .catch((e) => logPresenceError('wireOnlineAndOnDisconnect', e));
    };

    const goOfflineWhileAuthed = () => {
        if (disposed || auth.currentUser?.uid !== uid) return;
        set(userRef, { online: false, lastSeen: serverTimestamp() }).catch((e) =>
            logPresenceError('set offline (background)', e)
        );
    };

    // Critical: only register onDisconnect after the RTDB socket is actually connected to the server,
    // otherwise kill/close-app often leaves `online: true` forever.
    const connectedRef = ref(rtdb, '.info/connected');
    const unsubConnected = onValue(connectedRef, (snap) => {
        if (disposed || snap.val() !== true) return;
        wireOnlineAndOnDisconnect();
    });

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
        if (next === 'active') {
            wireOnlineAndOnDisconnect();
        } else {
            goOfflineWhileAuthed();
        }
    });

    return () => {
        disposed = true;
        unsubConnected();
        sub.remove();
        if (auth.currentUser?.uid === uid) {
            goOfflineWhileAuthed();
        }
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
