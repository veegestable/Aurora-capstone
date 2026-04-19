import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../../config/firebase'

/**
 * Uploads an image under `announcements/{uploaderId}/{timestamp}-{filename}`
 * and returns its download URL for embedding in an Announcement document.
 */
export async function uploadAnnouncementImage(
  uploaderId: string,
  file: File
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const path = `announcements/${uploaderId}/${Date.now()}-${safeName}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}