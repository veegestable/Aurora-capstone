import { doc, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '../../firebase-firestore/db'

export const revokeAccess = async (accessId: string) => {
  try {
    const studentRef = doc(db, 'users', accessId)

    await updateDoc(studentRef, {
      counselor_id: deleteField(),
      status: deleteField()
    })

    console.log(`✅ Revoked counselor access to student ${accessId}`)
    return { success: true }
  } catch (error) {
    console.error('Error revoking access: ', error)
  }
}