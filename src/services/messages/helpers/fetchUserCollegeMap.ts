import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { resolveCollegeFromUserRecord } from '../../../utils/conversationCollegeMessaging'

export async function fetchUserCollegeMap(
  userIds: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter((id) => id.trim()))]
  const map: Record<string, string> = {}
  await Promise.all(
    unique.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, 'users', id))
        map[id] = resolveCollegeFromUserRecord((snap.data() ?? {}) as Record<string, unknown>)
      } catch {
        map[id] = ''
      }
    }),
  )
  return map
}
