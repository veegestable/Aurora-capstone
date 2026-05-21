/** Shared Identity Toolkit helpers (Web API key from Firebase project settings). */

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isPlausibleEmail(email: string): boolean {
  if (email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function clientIpFromRequest(raw: {
  headers?: Record<string, unknown>;
  ip?: string;
}): string {
  const forwarded = raw.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  if (Array.isArray(forwarded) && typeof forwarded[0] === 'string') {
    return forwarded[0].split(',')[0]?.trim() || 'unknown';
  }
  return typeof raw.ip === 'string' && raw.ip ? raw.ip : 'unknown';
}

/** Web API key for Identity Toolkit REST (cannot use FIREBASE_ prefix in functions .env). */
export function getFirebaseWebApiKey(): string | undefined {
  return process.env.AURORA_IDENTITY_WEB_API_KEY?.trim() || undefined;
}

export async function identityToolkitSignIn(
  email: string,
  password: string,
): Promise<string | null> {
  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) {
    console.error('[authHelpers] AURORA_IDENTITY_WEB_API_KEY is not set');
    return null;
  }
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { idToken?: string };
    return typeof json.idToken === 'string' ? json.idToken : null;
  } catch (err) {
    console.warn('[authHelpers] signInWithPassword error', err);
    return null;
  }
}

export async function identityToolkitSendOobCode(
  requestType: 'VERIFY_EMAIL' | 'PASSWORD_RESET',
  opts: { email?: string; idToken?: string },
): Promise<boolean> {
  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) return false;
  const body: Record<string, string> = { requestType };
  if (opts.idToken) body.idToken = opts.idToken;
  if (opts.email) body.email = opts.email;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[authHelpers] sendOobCode non-OK', requestType, res.status, text.slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[authHelpers] sendOobCode error', requestType, err);
    return false;
  }
}
