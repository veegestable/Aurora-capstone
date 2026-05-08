import { Timestamp, addDoc, collection } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { ResourceItem } from '../../../types/resource.types'

type CreateResourceInput = Omit<ResourceItem, 'id' | 'createdAt' | 'updatedAt'>

export async function createResource(input: CreateResourceInput): Promise<string> {
  const now = Timestamp.now()

  const ref = await addDoc(collection(db, 'resources'), {
    title: input.title,
    category: input.category,
    duration: input.duration,
    type: input.type,
    image: input.image,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  })

  return ref.id
}