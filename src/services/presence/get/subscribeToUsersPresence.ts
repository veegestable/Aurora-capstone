import { ref, onValue } from 'firebase/database'
import { rtdb } from '../../../config/firebase'
import { PRESENCE_PATH } from '../helpers'

/**
 * Subscribe to /presence/{uid}/online for many users. 
 * Callback receives the latest map (missing id => offline).
 * @param userIds - Array of user IDs to subscribe to.
 * @param onUpdate - Callback function to receive the latest map.
 * @returns A function to unsubscribe from the users' presence.
 */
export function subscribeToUsersPresence(
  userIds: string[],
  onUpdate: (onlineById: Record<string, boolean>) => void
): () => void {
  if (!rtdb || userIds.length === 0) {
    onUpdate({})
    return () => {}
  }

  const unique = [...new Set(userIds.filter(Boolean))]
  const onlineById: Record<string, boolean> = {}
  const unsubs: (() => void)[] = []

  const emit = () => onUpdate({ ...onlineById })

  for (const id of unique) {
    const r = ref(rtdb, `${PRESENCE_PATH}/${id}/online`)
    const unsub = onValue(r, (snap) => {
      onlineById[id] = snap.val() === true
      emit()
    })
    unsubs.push(unsub)
  }

  return () => unsubs.forEach((u) => u())
}