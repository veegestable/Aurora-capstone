import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getDatabase, type Database } from 'firebase/database'
import { getFunctions } from 'firebase/functions'
import type { Analytics } from 'firebase/analytics'

const inferredDatabaseUrl = import.meta.env.VITE_FIREBASE_PROJECT_ID 
  ? `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.asia-southeast1.firebasedatabase.app` 
  : undefined

const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL || inferredDatabaseUrl

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  ...(databaseURL ? { databaseURL } : {}),
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
/** Region must match `functions/src/index.ts` (`asia-southeast2`). */
export const functions = getFunctions(app, 'asia-southeast2')

// Realtime Database (RTDB) - null if no databaseURL (presence disabled)
let rtdb: Database | null = null
if (databaseURL) {
  try {
    rtdb = getDatabase(app, databaseURL)
  } catch (e) {
    console.warn('[firebase] Realtime Database init failed:', e)
    rtdb = null
  }
} else {
  console.warn('[firebase] VITE_FIREBASE_DATABASE_URL is missing — presence disabled.')
}
export { rtdb }

// Only initialize analytics in production or if explicitly enabled
let analytics: Analytics | null = null
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  import('firebase/analytics').then(({ getAnalytics }) => {
    analytics = getAnalytics(app)
  }).catch(() => {
    // Analytics not available or blocked
  })
}

export { analytics }
export default app