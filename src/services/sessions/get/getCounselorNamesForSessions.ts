import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Session } from '../../../types/session.types'

/**
 * For a list of sessions, fetch the display name of each unique counselor.
 * 
 * Returns a Map keyed by `counselorId`. Missing/inaccessible users fall back
 * to the empty string so callers can decide what to render. 
 */
export async function getCounselorNamesForSessions(
  sessions: Session[]
): Promise<Map<string, string>> {
  const ids = Array.from(new Set(sessions.map((s) => s.counselorId). filter(Boolean)))
  if (ids.length === 0) return new Map()

  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, 'users', id))
        const name = (snap.data()?.full_name as string | undefined) ?? ''
        return [id, name] as const
      } catch {
        return [id, ''] as const
      }
    })
  )

  return new Map(entries)
}