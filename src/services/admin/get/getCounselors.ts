import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { AdminCounselorUser } from '../types'

export async function getCounselors(): Promise<AdminCounselorUser[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'counselor'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as AdminCounselorUser)
}