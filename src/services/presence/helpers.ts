import { ref } from 'firebase/database'
import { rtdb } from '../../config/firebase'

export const PRESENCE_PATH = 'presence'

export function presenceRef(uid: string) {
  if (!rtdb) return null
  return ref(rtdb, `${PRESENCE_PATH}/${uid}`)
}

export function logPresenceError(context: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  console.warn(`[presence] ${context}:`, msg)
}