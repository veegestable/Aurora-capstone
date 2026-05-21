import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'

const ARCHIVE_DOC_PREFIX = 'conv_arch__'

/** Counselor inbox hides threads listed under `users/{id}/private/conv_arch__*`. */
export async function getCounselorArchivedConversationIds(
  counselorId: string,
): Promise<Set<string>> {
  const out = new Set<string>()

  try {
    const priv = await getDocs(collection(db, 'users', counselorId, 'private'))
    priv.docs.forEach((d) => {
      if (d.id.startsWith(ARCHIVE_DOC_PREFIX)) {
        out.add(d.id.slice(ARCHIVE_DOC_PREFIX.length))
      }
    })
  } catch {
    /* ignore */
  }

  try {
    const legacy = await getDocs(
      collection(db, 'users', counselorId, 'archived_conversations'),
    )
    legacy.docs.forEach((d) => out.add(d.id))
  } catch {
    /* legacy subcollection may be denied */
  }

  return out
}
