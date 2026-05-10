/**
 * Rewrites malformed native deep links before Expo Router resolves them.
 * Android sometimes resumes with URLs like aurora-mobile://// (empty path), which
 * would otherwise show the unmatched-route screen.
 *
 * @see https://docs.expo.dev/router/advanced/native-intent/
 */
const APP_SCHEME = "aurora-mobile";

function normalizeToRouterPath(path: string): string {
  const raw = String(path ?? "").trim();
  if (!raw) return "/";
  if (/^\/+$/.test(raw)) return "/";

  let remainder = raw;
  const schemePrefix = `${APP_SCHEME}:`;
  const lower = raw.toLowerCase();
  const schemeIdx = lower.indexOf(schemePrefix);
  if (schemeIdx !== -1) {
    remainder = raw.slice(schemeIdx + schemePrefix.length).replace(/^\/+/, "");
    if (!remainder) return "/";
    remainder = `/${remainder.replace(/\/{2,}/g, "/")}`;
  }

  if (!remainder || remainder === "/" || /^\/+$/.test(remainder)) return "/";

  return remainder.startsWith("/") ? remainder : `/${remainder}`;
}

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    return normalizeToRouterPath(path);
  } catch {
    return "/";
  }
}
