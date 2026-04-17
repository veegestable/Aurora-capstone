import { useAuth } from '../contexts/AuthContext'
import { usePeerPresence } from './usePeerPresence'
import { presenceService } from '../services/presence'

/** 
 * Returns whether the currently signed-in user is online, 
 * plus whether RTDB is available at all.
 */
export function usePresence(): { isOnline: boolean; available: boolean } {
  const { user } = useAuth()
  const isOnline = usePeerPresence(user?.id)

  return { isOnline, available: presenceService.isPresenceAvailable() }
}