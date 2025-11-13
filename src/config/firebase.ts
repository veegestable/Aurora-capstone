// Firebase configuration for Aurora Mental Health App
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDuRbF-a7gOUEtMqz3YrjXyasGk0iojMPw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "aurora-44941.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "aurora-44941",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "aurora-44941.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "155700729425",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:155700729425:web:fd260508ac4bd635f20a70",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-GJRC3FL3QP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Only initialize analytics in production or if explicitly enabled
let analytics: any = null;
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  import('firebase/analytics').then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  }).catch(() => {
    // Analytics not available or blocked
  });
}

export { analytics };
export default app;