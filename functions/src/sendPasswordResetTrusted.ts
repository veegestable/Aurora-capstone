import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  clientIpFromRequest,
  getFirebaseWebApiKey,
  identityToolkitSendOobCode,
  isPlausibleEmail,
  normalizeEmail,
} from './authHelpers';

const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;
const PASSWORD_RESET_EMAIL_MAX = 3;
const PASSWORD_RESET_IP_MAX = 5;

/** Rate-limited password reset email (no auth — proves nothing, limits abuse). */
export function createSendPasswordResetTrusted(
  enforceRateLimit: (
    kind: string,
    key: string,
    windowMs: number,
    maxCount: number,
  ) => Promise<void>,
) {
  return onCall({ region: 'asia-southeast2' }, async (request) => {
    const data = (request.data ?? {}) as Partial<{ email: string }>;
    const email = normalizeEmail(typeof data.email === 'string' ? data.email : '');
    if (!isPlausibleEmail(email)) {
      throw new HttpsError('invalid-argument', 'Please enter a valid email address.');
    }

    if (!getFirebaseWebApiKey()) {
      throw new HttpsError(
        'unavailable',
        'Could not send reset email right now. Please try again later.',
      );
    }

    const ip = clientIpFromRequest(request.rawRequest);
    await enforceRateLimit(
      'password_reset_email',
      email,
      PASSWORD_RESET_WINDOW_MS,
      PASSWORD_RESET_EMAIL_MAX,
    );
    await enforceRateLimit(
      'password_reset_ip',
      ip,
      PASSWORD_RESET_WINDOW_MS,
      PASSWORD_RESET_IP_MAX,
    );

    const sent = await identityToolkitSendOobCode('PASSWORD_RESET', { email });
    if (!sent) {
      // Do not reveal whether the account exists (same as Firebase client SDK).
      console.warn('[sendPasswordResetTrusted] sendOobCode failed', email);
    }

    return { ok: true as const };
  });
}
