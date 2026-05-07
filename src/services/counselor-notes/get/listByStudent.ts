import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { CounselorNote, CounselorNoteDoc } from '../types'

export async function listByStudent(studentId: string, counselorId: string): Promise<CounselorNote[]> {
  const q = query(
    collection(db, 'counselor_notes'),
    where('studentId', '==', studentId),
    where('counselorId', '==', counselorId),
    orderBy('updatedAt', 'desc')
  )

  const snap = await getDocs(q)

  return snap.docs.map((d) => {
    const data = d.data() as CounselorNoteDoc
    return {
      id: d.id,
      counselorId: data.counselorId,
      studentId: data.studentId,
      note: data.note,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    }
  })
}