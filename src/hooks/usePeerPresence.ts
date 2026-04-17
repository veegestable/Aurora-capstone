import { useEffect, useState } from 'react'
import { presenceService } from '../services/presence'

/** Live online flag for a single peer (counselor or student uid). */
export function usePeerPresence(peerUserId: string | null | undefined): boolean {
  const [online, setOnline] = useState(false)

  useEffect(() => {
    if (!peerUserId) {
      setOnline(false)
      return
    }
    return presenceService.subscribeToUsersPresence([peerUserId], (map) => {
      setOnline(map[peerUserId] === true)
    })
  }, [peerUserId])

  return online
}

/** 
 * Live online flags for a list of peers. 
 * Keys missing from the map default to false.  
 */
export function useUsersPresence(peerUserIds: string[]): Record<string, boolean> {
  const [onlineById, setOnlineById] = useState<Record<string, boolean>>({})

  const key = [...new Set(peerUserIds.filter(Boolean))].sort().join(',')

  useEffect(() => {
    if (!key) {
      setOnlineById({})
      return
    }

    return presenceService.subscribeToUsersPresence(key.split(','), (map) => setOnlineById(map))
  }, [key])

  return onlineById
}