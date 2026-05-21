/** Server-side sign-up email policy (mirrors web/mobile env). */

const MSUIIT_SUFFIX = '@g.msuiit.edu.ph';

function stripQuotes(s: string): string {
  const t = s.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
}

export function parseSignupEmailAllowlist(raw: string | undefined): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const outer = stripQuotes(raw);
  return outer
    .split(/[,;\n]+/)
    .map((s) => stripQuotes(s).toLowerCase())
    .filter(Boolean);
}

export function isSignupEmailAllowlisted(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;
  return parseSignupEmailAllowlist(process.env.SIGNUP_EMAIL_ALLOWLIST).includes(
    trimmed,
  );
}

/** Ignored in production — only Functions emulator may disable MSU-IIT suffix check. */
function isEmulatorOpenSignupEmailEnabled(): boolean {
  return (
    process.env.FUNCTIONS_EMULATOR === 'true' &&
    process.env.REQUIRE_MSUIIT_SIGNUP_EMAIL === 'false'
  );
}

export function getSignupEmailRejectionMessage(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return 'Enter your email address.';
  if (!trimmed.includes('@')) return 'Enter a valid email address.';

  if (isEmulatorOpenSignupEmailEnabled()) return null;
  if (isSignupEmailAllowlisted(trimmed)) return null;
  if (!trimmed.endsWith(MSUIIT_SUFFIX)) {
    return `Use your MSU-IIT email (${MSUIIT_SUFFIX})`;
  }
  return null;
}
