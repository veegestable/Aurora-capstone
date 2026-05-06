import { Timestamp, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { ResourceItem } from '../../../types/resource.types'

interface UpdateResourceInput {
  id: string
  patch: Partial<Omit<ResourceItem, 'id' | 'createdAt' | 'updatedAt'>>
}

export async function updateResource(input: UpdateResourceInput): Promise<void> {
  await updateDoc(doc(db, 'resources', input.id), {
    ...input.patch,
    updatedAt: Timestamp.now()
  })
}
