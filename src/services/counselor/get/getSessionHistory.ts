import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase-firestore/db'

export interface SessionRecord {
  id: string
  status: string
}

export const getSessionHistory = async (counselorId: string): Promise<SessionRecord[]> => {
  try {
    const q = query(
      collection(db, 'sessions'),
      where('counselor_id', '==', counselorId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      status: doc.data().status || 'unknown'
    }))
  } catch (error) {
    console.error('Error fetching session history: ', error)
    return []
  }
}