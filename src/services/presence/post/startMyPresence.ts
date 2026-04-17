import { ref, set, onDisconnect, serverTimestamp, onValue } from 'firebase/database'
import { auth, rtdb } from '../../../config/firebase'
import { presenceRef, logPresenceError } from '../helpers'

/**
 * Mark the current user online, register onDisconnect offline, and sync with tab visibility.
 * Call once per signed-in user; run the returned cleanup on sign-out or unmount.
 * @param uid - The user ID to mark as online.
 * @returns A function to cleanup the presence tracking.
 */
export function startMyPresence(uid: string): () => void {
  if (!rtdb) {
    console.warn('[presence] Realtime Database not initialized — check VITE_FIREBASE_DATABASE_URL and restart Vite')
    return () => {}
  }

  const authUid = auth.currentUser?.uid
  if (authUid && authUid !== uid) console.warn('[presence] user.id does not match auth.uid — writes may fail. user.id=', uid, 'auth.uid=', authUid)

  const userRef = presenceRef(uid)
  if (!userRef) return () => {}

  let disposed = false

  const wireOnlineAndOnDisconnect = () => {
    if (disposed || auth.currentUser?.uid !== uid) return
    onDisconnect(userRef)
      .set({ online: false, lastSeen: serverTimestamp() })
      .then(() => set(userRef, { online: true, lastSeen: serverTimestamp() }))
      .catch((e) => logPresenceError('wireOnlineAndOnDisconnect', e))
  }

  const goOfflineWhileAuthed = () => {
    if (disposed || auth.currentUser?.uid !== uid) return
    set(userRef, { online: false, lastSeen: serverTimestamp() })
      .catch((e) => logPresenceError('set offline (background)', e))
  }

  // Only register onDisconnect after the RTDB socket is actually connected,
  // otherwise closing the tab often leaves `online: true` forever.
  const connectedRef = ref(rtdb, '.info/connected')
  const unsubConnected = onValue(connectedRef, (snap) => {
    if (disposed || snap.val() !== true) return
    wireOnlineAndOnDisconnect()
  })

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      wireOnlineAndOnDisconnect()
    } else {
      goOfflineWhileAuthed()
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    disposed = true
    unsubConnected()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    if (auth.currentUser?.uid === uid) goOfflineWhileAuthed()
  }
}