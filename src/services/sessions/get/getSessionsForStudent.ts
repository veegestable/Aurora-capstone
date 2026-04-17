import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { Session } from '../../../types/session.types'

export async function getSessionsForStudent(studentId: string): Promise<Session[]> {
  const q = query(
    collection(db, 'sessions'),
    where('studentId', '==', studentId),
    orderBy('updatedAt', 'desc')
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    } as Session
  })
}