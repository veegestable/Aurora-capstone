// Firebase Storage Service for Aurora
// Handles image uploads for profile pictures, announcements, etc.
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

const UPLOAD_TIMEOUT_MS = 30_000;

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
  contentType = "image/jpeg",
): Promise<string> {
  const blob = await withTimeout(uriToBlob(imageUri), UPLOAD_TIMEOUT_MS, "Image conversion timed out");
  const storageRef = ref(storage, storagePath);
  const snapshot = await withTimeout(
    uploadBytes(storageRef, blob, { contentType }),
    UPLOAD_TIMEOUT_MS,
    "Image upload timed out — check your connection",
  );
  return getDownloadURL(snapshot.ref);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/**
 * Convert a React Native / Expo image URI to a Blob for upload.
 * Uses fetch (reliable across iOS/Android) with XHR fallback.
 */
async function uriToBlob(uri: string): Promise<Blob> {
  try {
    const response = await fetch(uri);
    return await response.blob();
  } catch {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = UPLOAD_TIMEOUT_MS;
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new TypeError("Failed to read image file"));
      xhr.ontimeout = () => reject(new Error("Reading image timed out"));
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send();
    });
  }
}
