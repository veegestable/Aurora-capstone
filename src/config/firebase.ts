// Firebase configuration for Aurora Mental Health App
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDuRbF-a7gOUEtMqz3YrjXyasGk0iojMPw",
  authDomain: "aurora-44941.firebaseapp.com",
  projectId: "aurora-44941",
  storageBucket: "aurora-44941.firebasestorage.app",
  messagingSenderId: "155700729425",
  appId: "1:155700729425:web:fd260508ac4bd635f20a70",
  measurementId: "G-GJRC3FL3QP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;