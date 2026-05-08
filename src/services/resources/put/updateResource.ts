import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { ResourceRecord } from '../types'

export const updateResource= async (
  id: string,
  patch: Partial<Omit<ResourceRecord, 'id'>>
): Promise<void> => {
  const ref = doc(db, 'resources', id)
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp()
  } as Record<string, unknown>)
}