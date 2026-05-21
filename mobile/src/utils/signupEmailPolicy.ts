const MSUIIT_SUFFIX = "@g.msuiit.edu.ph";

/** True when the address uses the MSU-IIT Google Workspace student suffix. */
export function isMsuiitInstitutionalEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(MSUIIT_SUFFIX);
}

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

/** Comma/semicolon/newline-separated list; trims; lowercases; strips wrapping quotes per token. */
export function parseSignupEmailAllowlist(raw: string | undefined): string[] {
  if (!raw || typeof raw !== "string") return [];
  const outer = stripQuotes(raw);
  return outer
    .split(/[,;\n]+/)
    .map((s) => stripQuotes(s).toLowerCase())
    .filter(Boolean);
}

/** Open signup to any email — only in Expo dev, not production builds. */
function isDevOpenSignupEmailEnabled(): boolean {
  return (
    __DEV__ && process.env.EXPO_PUBLIC_REQUIRE_MSUIIT_SIGNUP_EMAIL === "false"
  );
}

/** QA test addresses in EXPO_PUBLIC_SIGNUP_EMAIL_ALLOWLIST (preferred over open signup). */
export function isSignupEmailAllowlisted(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;
  return parseSignupEmailAllowlist(
    process.env.EXPO_PUBLIC_SIGNUP_EMAIL_ALLOWLIST,
  ).includes(trimmed);
}

/**
 * Firestore directory flag: true when Auth verified, or allowlisted legacy QA email.
 * Does not change Firebase Auth — only how we store/read `users.email_verified`.
 */
export function firestoreEmailVerifiedEffective(
  authEmailVerified: boolean,
  email: string,
): boolean {
  if (authEmailVerified) return true;
  return isSignupEmailAllowlisted(email);
}

/**
 * Sign-in: require Firebase emailVerified unless exempt (QA allowlist or global dev flag).
 */
export function isEmailVerificationRequiredForSignIn(email: string): boolean {
  if (__DEV__ && process.env.EXPO_PUBLIC_ALLOW_UNVERIFIED_SIGNIN === "true") {
    return false;
  }
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return true;
  if (isSignupEmailAllowlisted(trimmed)) return false;
  return true;
}

/**
 * New sign-ups only. Requires @g.msuiit.edu.ph unless allowlisted.
 * EXPO_PUBLIC_REQUIRE_MSUIIT_SIGNUP_EMAIL=false only applies in __DEV__.
 */
export function getSignupEmailRejectionMessage(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return "Enter your email address.";
  if (!trimmed.includes("@")) return "Enter a valid email address.";

  if (isDevOpenSignupEmailEnabled()) return null;

  if (isSignupEmailAllowlisted(trimmed)) return null;

  if (!trimmed.endsWith(MSUIIT_SUFFIX)) {
    return `Use your MSU-IIT email (${MSUIIT_SUFFIX})`;
  }

  return null;
}
