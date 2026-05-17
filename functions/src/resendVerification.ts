import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  clientIpFromRequest,
  identityToolkitSendOobCode,
  identityToolkitSignIn,
  isPlausibleEmail,
  normalizeEmail,
} from './authHelpers';

const VERIFY_EMAIL_WINDOW_MS = 60 * 60 * 1000;
const VERIFY_EMAIL_MAX = 3;
const VERIFY_IP_MAX = 10;

/** Rate-limited resend of registration verification email (proves email+password server-side). */
export function createResendRegistrationVerificationTrusted(
  enforceRateLimit: (
    kind: string,
    key: string,
    windowMs: number,
    maxCount: number,
  ) => Promise<void>,
) {
  return onCall({ region: 'asia-southeast2' }, async (request) => {
    const data = (request.data ?? {}) as Partial<{ email: string; password: string }>;
    const email = normalizeEmail(typeof data.email === 'string' ? data.email : '');
    const password = typeof data.password === 'string' ? data.password : '';
    if (!isPlausibleEmail(email) || password.length < 6) {
      throw new HttpsError(
        'invalid-argument',
        'Enter the same email and password you used when signing up.',
      );
    }

    const ip = clientIpFromRequest(request.rawRequest);
    await enforceRateLimit('verify_email', email, VERIFY_EMAIL_WINDOW_MS, VERIFY_EMAIL_MAX);
    await enforceRateLimit('verify_ip', ip, VERIFY_EMAIL_WINDOW_MS, VERIFY_IP_MAX);

    const idToken = await identityToolkitSignIn(email, password);
    if (!idToken) {
      throw new HttpsError(
        'permission-denied',
        'The email or password you entered is incorrect. Please try again.',
      );
    }

    const sent = await identityToolkitSendOobCode('VERIFY_EMAIL', { idToken });
    if (!sent) {
      throw new HttpsError(
        'unavailable',
        'Could not send verification email right now. Please try again later.',
      );
    }

    return { ok: true };
  });
}
