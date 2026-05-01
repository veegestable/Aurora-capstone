import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'

export async function studentConfirmFinalSlot(
  sessionId: string,
  studentId: string, 
  slot: {
    date: string
    time: string
  },
  opts?: {
    conversationId?: string
    counselorId?: string
  }
) {
  const sessionRef = doc(db, 'sessions', sessionId)
  const snap = await getDoc(sessionRef)
  if (!snap.exists()) throw new Error('Session not found')

  const data = snap.data()!
  const uid = String(studentId)

  // Verify Authorization
  let authorized = data.studentId != null && String(data.studentId) === uid

  if (!authorized && data.studentId == null && opts?.conversationId && opts?.conversationId) {
    const convSnap = await getDoc(doc(db, 'conversations', opts.conversationId))
    const conv = convSnap.data()
    
    const counselorOk = String(data.counselorId ?? '') === String(opts.counselorId)
    const studentOk = conv != null && String(conv.studentId ?? '') === uid

    if (counselorOk && studentOk) authorized = true
  }

  if (!authorized) throw new Error('Not authorized')

  const patch: Record<string, unknown> = {
    finalSlot: slot,
    confirmedSlot: slot,
    status: 'confirmed',
    updatedAt: Timestamp.now()
  }

  if (data.studentId  == null) patch.studentId = uid

  await updateDoc(sessionRef, patch as any)
}