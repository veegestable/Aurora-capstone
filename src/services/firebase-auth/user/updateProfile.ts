import { doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { UpdateProfileData } from '../types'

export const updateProfile = async (
  userId: string,
  data: UpdateProfileData
): Promise<void> => {
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, {
    ...data,
    updated_at: Timestamp.now()
  })
}