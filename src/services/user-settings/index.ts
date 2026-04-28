import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import type { UserSettingsDoc } from '../../types/user-settings.types'

export const userSettingsService = {
  getUserSettings: async (userId: string): Promise<UserSettingsDoc | null> => {
    const docRef = doc(db, 'userSettings', userId)
    const snapshot = await getDoc(docRef)

    if (snapshot.exists()) return snapshot.data() as UserSettingsDoc

    return null
  },

  updateUserSettings: async (userId: string, data: Partial<UserSettingsDoc>): Promise<void> => {
    const docRef = doc(db, 'userSettings', userId)
    const snapshot = await getDoc(docRef)

    if (snapshot.exists()) {
      await updateDoc(docRef, data)
    } else {
      await setDoc(docRef, {
        ...data,
        createdAt: new Date().toISOString()
      })
    }
  }
}