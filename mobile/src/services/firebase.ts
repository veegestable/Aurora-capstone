// Firebase configuration for Aurora Mental Health App
import { initializeApp, getApp, getApps } from 'firebase/app';
// @ts-ignore
import { getAuth, Auth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase, type Database } from 'firebase/database';

const inferredDatabaseUrl =
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
        ? `https://${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
        : undefined;

const databaseURL =
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || inferredDatabaseUrl;

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
    ...(databaseURL ? { databaseURL } : {}),
};

// Initialize Firebase
let app;
let auth: Auth;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    // Initialize Auth with AsyncStorage persistence
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
} else {
    app = getApp();
    auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);

/** Realtime Database — null if no databaseURL (presence disabled). */
let rtdb: Database | null = null;
if (databaseURL) {
    try {
        rtdb = getDatabase(app);
    } catch (e) {
        console.warn('[firebase] Realtime Database init failed:', e);
        rtdb = null;
    }
}
export { rtdb };

export default app;
