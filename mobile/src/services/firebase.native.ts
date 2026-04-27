// Firebase configuration for Aurora Mental Health App (native)
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, Auth, initializeAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase, type Database } from 'firebase/database';

const inferredDatabaseUrl =
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
        ? `https://${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.asia-southeast1.firebasedatabase.app`
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

let app;
let auth: Auth;
let dbInstance;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    auth = initializeAuth(app);
    dbInstance = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
    });
} else {
    app = getApp();
    auth = getAuth(app);
    dbInstance = getFirestore(app);
}

export { auth };
export const db = dbInstance;
export const storage = getStorage(app);

/** Realtime Database — null if no databaseURL (presence disabled). */
let rtdb: Database | null = null;
if (databaseURL) {
    try {
        rtdb = getDatabase(app, databaseURL);
    } catch (e) {
        console.warn('[firebase] Realtime Database init failed:', e);
        rtdb = null;
    }
} else {
    console.warn('[firebase] EXPO_PUBLIC_FIREBASE_DATABASE_URL is missing — presence disabled.');
}
export { rtdb };

export default app;
