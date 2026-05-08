import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../../config/firebase'

interface OutcomeCounts {
  completed: number
  missed: number
}

export async function getSessionOutcomeCountsForCounselorStudent(
  counselorId: string,
  studentId: string,
): Promise<OutcomeCounts> {
  if (!counselorId || !studentId) return { completed: 0, missed: 0 }

  const q = query(
    collection(db, 'sessions'),
    where('counselorId', '==', counselorId),
    where('studentId', '==', studentId),
  )
  const snap = await getDocs(q)

  let completed = 0
  let missed = 0
  snap.forEach(d => {
    const status = d.data().status
    if (status === 'completed') completed += 1
    else if (status === 'missed') missed += 1
  })
  return { completed, missed }
}