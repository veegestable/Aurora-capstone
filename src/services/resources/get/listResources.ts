import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { ResourceItem, ResourceDoc, ResourceStatus } from '../../../types/resource.types'

export async function listResources(status?: ResourceStatus): Promise<ResourceItem[]> {
  const base = collection(db, 'resources')
  const q = status
    ? query(base, where('status', '==', status), orderBy('updatedAt', 'desc'))
    : query(base, orderBy('updatedAt', 'desc'))

  const snap = await getDocs(q)

  return snap.docs.map((d) => {
    const data = d.data() as ResourceDoc
    return {
      id: d.id,
      title: data.title || 'Untitled',
      category: data.category || 'General',
      duration: data.duration || 'NA',
      type: data.type || 'Meditation',
      image: data.image || '',
      status: data.status || 'published',
      createdAt: data.createdAt?.toDate?.(),
      updatedAt: data.updatedAt?.toDate?.(),
    }
  })
}