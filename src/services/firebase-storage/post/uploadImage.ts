import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../../config/firebase'

export const uploadImage = async (
  storagePath: string,
  file: Blob | File,
  contentType?: string
): Promise<string> => {
  const storageRef = ref(storage, storagePath)
  const resolvedType = contentType || (file instanceof File ? file.type : 'image/jpeg')
  const snapshot = await uploadBytes(storageRef, file, { contentType: resolvedType })
  return getDownloadURL(snapshot.ref)
}