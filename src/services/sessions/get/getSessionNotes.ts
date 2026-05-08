import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { SessionNote } from '../types'

export async function getSessionNotes(sessionId: string): Promise<SessionNote[]> {
  const q = query(
    collection(db, 'session_notes'),
    where('sessionId', '==', sessionId),
    orderBy('updatedAt', 'desc')
  )

  const snap = await getDocs(q)

  return snap.docs.map((d) => {
    const data = d.data() as {
      sessionId: string
      counselorId: string
      note: string
      createdAt?: { toDate?: () => Date }
      updatedAt?: { toDate?: () => Date }
    }

    return {
      id: d.id,
      sessionId: data.sessionId,
      counselorId: data.counselorId,
      note: data.note || '',
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    }
  })
}