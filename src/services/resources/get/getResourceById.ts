import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { ResourceRecord } from '../types'

export const getResourceById = async (id: string): Promise<ResourceRecord | null> => {
  try {
    const ref = doc(db, 'resources', id)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return {
      id: snap.id,
      ...(snap.data() as Omit<ResourceRecord, 'id'>)
    }
  } catch (error: unknown) {
    console.error('❌ Get resource by ID error:', error instanceof Error ? error.message : error)
    return null
  }
}