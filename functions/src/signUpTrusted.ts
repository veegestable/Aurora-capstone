import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  clientIpFromRequest,
  identityToolkitSendOobCode,
  identityToolkitSignIn,
  isPlausibleEmail,
  normalizeEmail,
} from './authHelpers';
import { isCollegeCode, isProgramInCollege, type CollegeCode } from './iitCollegePrograms';
import { getSignupEmailRejectionMessage } from './signupEmailPolicy';

const SIGNUP_IP_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_IP_MAX = 5;
/** Failed or successful registration attempts per email per hour. */
const SIGNUP_EMAIL_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_EMAIL_ATTEMPT_MAX = 3;

export type SignUpTrustedInput = {
  email: string;
  password: string;
  fullName: string;
  role: 'student' | 'counselor';
  college_code: string;
  program?: string;
  contact_number?: string;
};

function parseSignUpInput(
  data: Record<string, unknown> | undefined,
): SignUpTrustedInput {
  const email = normalizeEmail(typeof data?.email === 'string' ? data.email : '');
  const password = typeof data?.password === 'string' ? data.password : '';
  const fullName = typeof data?.fullName === 'string' ? data.fullName.trim() : '';
  const role = data?.role === 'student' ? data.role : null;
  const college_code =
    typeof data?.college_code === 'string' ? data.college_code.trim() : '';
  const program =
    typeof data?.program === 'string' ? data.program.trim() : undefined;
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
      'Choose a stronger password (at least 6 characters).',
    );
  }
  if (!fullName) {
    throw new HttpsError('invalid-argument', 'Enter your full name.');
  }
  if (!role) {
    throw new HttpsError(
      'invalid-argument',
      'Public registration is for students only. Counselor accounts are created by an admin.',
    );
  }
  if (!isCollegeCode(college_code)) {
    throw new HttpsError('invalid-argument', 'Select a valid college before signing up.');
  }
  if (role === 'student') {
    if (!program || !isProgramInCollege(college_code, program)) {
      throw new HttpsError(
        'invalid-argument',
        'Select a degree program that matches your college before signing up.',
      );
    }
  }

  const policyError = getSignupEmailRejectionMessage(email);
  if (policyError) {
    throw new HttpsError('invalid-argument', policyError);
  }

  return {
    email,
    password,
    fullName,
    role,
    college_code,
    ...(role === 'student' && program ? { program } : {}),
    ...(contact_number ? { contact_number } : {}),
  };
}

/** Rate-limited registration via Admin SDK (web + mobile). */
export function createSignUpTrusted(
  enforceRateLimit: (
    kind: string,
    key: string,
    windowMs: number,
    maxCount: number,
  ) => Promise<void>,
) {
  return onCall({ region: 'asia-southeast2' }, async (request) => {
    const input = parseSignUpInput(
      (request.data ?? {}) as Record<string, unknown>,
    );

    const ip = clientIpFromRequest(request.rawRequest);
    await enforceRateLimit('signup_ip', ip, SIGNUP_IP_WINDOW_MS, SIGNUP_IP_MAX);
    await enforceRateLimit(
      'signup_email_attempt',
      input.email,
      SIGNUP_EMAIL_ATTEMPT_WINDOW_MS,
      SIGNUP_EMAIL_ATTEMPT_MAX,
    );

    const auth = admin.auth();
    try {
      await auth.getUserByEmail(input.email);
      throw new HttpsError(
        'already-exists',
        'An account with this email already exists. Try signing in instead.',
      );
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code !== 'auth/user-not-found') {
        if (err instanceof HttpsError) throw err;
        console.error('[signUpTrusted] getUserByEmail', err);
        throw new HttpsError(
          'internal',
          'Could not complete registration. Please try again.',
        );
      }
    }

    let uid: string | undefined;
    const db = admin.firestore();
    try {
      const userRecord = await auth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.fullName,
        emailVerified: false,
      });
      uid = userRecord.uid;

      const now = admin.firestore.FieldValue.serverTimestamp();
      const profile: Record<string, unknown> = {
        uid,
        email: input.email,
        full_name: input.fullName,
        role: input.role,
        email_verified: false,
        college_code: input.college_code as CollegeCode,
        created_at: now,
        updated_at: now,
      };
      if (input.role === 'student' && input.program) {
        profile.program = input.program;
      }
      if (input.contact_number) {
        profile.contact_number = input.contact_number;
      }

      await db.collection('users').doc(uid).set(profile);

      const idToken = await identityToolkitSignIn(input.email, input.password);
      if (!idToken) {
        throw new HttpsError(
          'unavailable',
          'Could not send verification email right now. Please try again later.',
        );
      }
      const sent = await identityToolkitSendOobCode('VERIFY_EMAIL', { idToken });
      if (!sent) {
        throw new HttpsError(
          'unavailable',
          'Could not send verification email right now. Please try again later.',
        );
      }

      return { ok: true as const, uid };
    } catch (err: unknown) {
      if (uid) {
        try {
          await db.collection('users').doc(uid).delete();
        } catch (cleanupErr) {
          console.warn('[signUpTrusted] cleanup users doc failed', cleanupErr);
        }
        try {
          await auth.deleteUser(uid);
        } catch (cleanupErr) {
          console.warn('[signUpTrusted] cleanup deleteUser failed', cleanupErr);
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
          'An account with this email already exists. Try signing in instead.',
        );
      }
      if (code === 'auth/weak-password') {
        throw new HttpsError(
          'invalid-argument',
          'Choose a stronger password (at least 6 characters).',
        );
      }
      console.error('[signUpTrusted] createUser/profile', err);
      throw new HttpsError(
        'internal',
        'Could not complete registration. Please try again.',
      );
    }
  });
}
