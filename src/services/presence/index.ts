import { isPresenceAvailable } from './get/isPresenceAvailable'
import { subscribeToUsersPresence } from './get/subscribeToUsersPresence'
import { startMyPresence } from './post/startMyPresence'
import { setMyPresenceOfflineNow } from './put/setMyPresenceOfflineNow'

export const presenceService = {
  isPresenceAvailable,
  subscribeToUsersPresence,
  startMyPresence,
  setMyPresenceOfflineNow
}