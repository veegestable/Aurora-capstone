import { set, serverTimestamp } from 'firebase/database'
import { auth, rtdb } from '../../../config/firebase'
import { presenceRef, logPresenceError } from '../helpers'

/**
 * Set offline while still signed in to Firebase Auth.
 * Must run before `signOut()` — after logout, RTDB rules block writes so the node would stay `online: true`.
 * @param uid - The user ID to set offline.
 * @returns A promise that resolves when the presence is set offline.
 */
export async function setMyPresenceOfflineNow(uid: string): Promise<void> {
  if (!rtdb) return
  const userRef = presenceRef(uid)
  if (!userRef) return
  if (auth.currentUser?.uid !== uid) {
    console.warn('[presence] setMyPresenceOfflineNow skipped — auth uid mismatch')
    return
  }

  try {
    await set(userRef, { online: false, lastSeen: serverTimestamp() })
  } catch (e) {
    logPresenceError('setMyPresenceOfflineNow', e)
    throw e
  }
}