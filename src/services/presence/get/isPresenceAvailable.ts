import { rtdb } from '../../../config/firebase'

export function isPresenceAvailable() {
  return rtdb !== null
}