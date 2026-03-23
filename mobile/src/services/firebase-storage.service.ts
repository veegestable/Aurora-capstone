// Firebase Storage Service for Aurora
// Handles image uploads for profile pictures, announcements, etc.
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload an image from a local URI (e.g. from ImagePicker) to Firebase Storage.
 * @param storagePath - Full path in Storage bucket (e.g. 'avatars/uid123' or 'announcements/abc-uuid.jpg')
 * @param imageUri - Local file URI (file:// or content://)
 * @param contentType - MIME type, defaults to 'image/jpeg'
 * @returns Download URL of the uploaded image
 */
export async function uploadImage(
  storagePath: string,
  imageUri: string,
  contentType = 'image/jpeg'
): Promise<string> {
  const blob = await uriToBlob(imageUri);
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(snapshot.ref);
}

/**
 * Convert a React Native / Expo image URI to a Blob for upload.
 * Works with file:// and content:// URIs.
 */
async function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new TypeError('Failed to fetch image'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send();
  });
}
