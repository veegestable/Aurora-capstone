import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase-firestore/db'

export const grantAccess = async (
  counselorId: string,
  studentId: string
) => {
  try {
    const studentRef = doc(db, 'users', studentId)

    await updateDoc(studentRef, {
      counselor_id: counselorId,
      status: 'active'
    })

    console.log(`✅ Granted counselor ${counselorId} access to student ${studentId}`)
    return { success: true }
  } catch (error) {
    console.error('Error granting access: ', error)
    throw error
  }
}