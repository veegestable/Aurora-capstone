import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { isSignupEmailAllowlisted } from './signupEmailPolicy';

/**
 * After sign-in, mark QA allowlisted emails verified in Auth + Firestore.
 * Uses server SIGNUP_EMAIL_ALLOWLIST so production web builds do not need VITE_* baked in.
 */
export const syncAllowlistedEmailVerificationTrusted = onCall(
  { region: 'asia-southeast2' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }

    const auth = admin.auth();
    const userRecord = await auth.getUser(uid);
    if (userRecord.emailVerified) {
      return { ok: true as const, synced: false };
    }

    const email = userRecord.email?.trim().toLowerCase() ?? '';
    if (!email || !isSignupEmailAllowlisted(email)) {
      return { ok: true as const, synced: false };
    }

    await auth.updateUser(uid, { emailVerified: true });

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();
    if (snap.exists) {
      await userRef.update({
        email_verified: true,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return { ok: true as const, synced: true };
  },
);
