import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../../config/firebase'
import { updateProfile } from './updateProfile'

export const uploadAvatar = async (
  userId: string,
  file: File
): Promise<string> => {
  const storageRef = ref(storage, `avatars/${userId}`)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  await updateProfile(userId, { avatar_url: url })
  return url
}