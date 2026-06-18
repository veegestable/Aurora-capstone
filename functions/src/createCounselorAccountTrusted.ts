import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { isCollegeCode, type CollegeCode } from './iitCollegePrograms';
import { getSignupEmailRejectionMessage } from './signupEmailPolicy';
import { isPlausibleEmail, normalizeEmail } from './authHelpers';

export type CreateCounselorAccountTrustedInput = {
  email: string;
  password: string;
  fullName: string;
  college_code: string;
  contact_number?: string;
};

function parseCreateCounselorInput(
  data: Record<string, unknown> | undefined,
): CreateCounselorAccountTrustedInput {
  const email = normalizeEmail(typeof data?.email === 'string' ? data.email : '');
  const password = typeof data?.password === 'string' ? data.password : '';
  const fullName = typeof data?.fullName === 'string' ? data.fullName.trim() : '';
  const college_code =
    typeof data?.college_code === 'string' ? data.college_code.trim() : '';
  const contact_number =
    typeof data?.contact_number === 'string'
      ? data.contact_number.trim()
      : undefined;

  if (!isPlausibleEmail(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  }
  if (password.length < 6) {
    throw new HttpsError(
      'invalid-argument',
      'Temporary password must be at least 6 characters.',
    );
  }
  if (!fullName) {
    throw new HttpsError('invalid-argument', "Enter the counselor's full name.");
  }
  if (!isCollegeCode(college_code)) {
    throw new HttpsError('invalid-argument', 'Select a valid college.');
  }

  const policyError = getSignupEmailRejectionMessage(email);
  if (policyError) {
    throw new HttpsError('invalid-argument', policyError);
  }

  return {
    email,
    password,
    fullName,
    college_code,
    ...(contact_number ? { contact_number } : {}),
  };
}

/** Admin-only counselor provisioning (replaces public counselor self-signup). */
export function createCreateCounselorAccountTrusted(
  getRoleForUid: (uid: string) => Promise<string>,
) {
  return onCall({ region: 'asia-southeast2' }, async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }

    const callerRole = await getRoleForUid(callerUid);
    if (callerRole !== 'admin') {
      throw new HttpsError(
        'permission-denied',
        'Only admins can create counselor accounts.',
      );
    }

    const input = parseCreateCounselorInput(
      (request.data ?? {}) as Record<string, unknown>,
    );

    const auth = admin.auth();
    const db = admin.firestore();

    try {
      await auth.getUserByEmail(input.email);
      throw new HttpsError(
        'already-exists',
        'An account with this email already exists.',
      );
    } catch (err: unknown) {
      if (err instanceof HttpsError) throw err;
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code !== 'auth/user-not-found') {
        console.error('[createCounselorAccountTrusted] getUserByEmail', err);
        throw new HttpsError(
          'internal',
          'Could not create counselor account. Please try again.',
        );
      }
    }

    let uid: string | undefined;
    try {
      const userRecord = await auth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.fullName,
        emailVerified: true,
      });
      uid = userRecord.uid;

      const now = admin.firestore.FieldValue.serverTimestamp();
      const profile: Record<string, unknown> = {
        uid,
        email: input.email,
        full_name: input.fullName,
        role: 'counselor',
        email_verified: true,
        approval_status: 'approved',
        college_code: input.college_code as CollegeCode,
        provisioned_by_admin: true,
        created_by_admin_uid: callerUid,
        created_at: now,
        updated_at: now,
      };
      if (input.contact_number) {
        profile.contact_number = input.contact_number;
      }

      await db.collection('users').doc(uid).set(profile);

      return { ok: true as const, uid };
    } catch (err: unknown) {
      if (uid) {
        try {
          await db.collection('users').doc(uid).delete();
        } catch (cleanupErr) {
          console.warn(
            '[createCounselorAccountTrusted] cleanup users doc failed',
            cleanupErr,
          );
        }
        try {
          await auth.deleteUser(uid);
        } catch (cleanupErr) {
          console.warn(
            '[createCounselorAccountTrusted] cleanup deleteUser failed',
            cleanupErr,
          );
        }
      }
      if (err instanceof HttpsError) throw err;
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code === 'auth/email-already-exists') {
        throw new HttpsError(
          'already-exists',
          'An account with this email already exists.',
        );
      }
      if (code === 'auth/weak-password') {
        throw new HttpsError(
          'invalid-argument',
          'Temporary password must be at least 6 characters.',
        );
      }
      console.error('[createCounselorAccountTrusted] createUser/profile', err);
      throw new HttpsError(
        'internal',
        'Could not create counselor account. Please try again.',
      );
    }
  });
}
