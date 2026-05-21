import { FirebaseError } from "firebase/app";

/** Read `retryAfterSeconds` from a Cloud Functions resource-exhausted error. */
export function getRetryAfterSecondsFromError(err: unknown): number | null {
  if (err instanceof FirebaseError && err.code === "functions/resource-exhausted") {
    const fromDetails = readRetryAfterFromDetails(err);
    if (fromDetails != null) return fromDetails;
    return parseRetryAfterSecondsFromText(err.message);
  }
  if (err instanceof Error) {
    return parseRetryAfterSecondsFromText(err.message);
  }
  return null;
}

function readRetryAfterFromDetails(err: {
  customData?: unknown;
  details?: unknown;
}): number | null {
  const raw = err.customData ?? err.details;
  if (!raw || typeof raw !== "object") return null;
  const n = (raw as { retryAfterSeconds?: unknown }).retryAfterSeconds;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return Math.ceil(n);
}

export function parseRetryAfterSecondsFromText(text: string): number | null {
  const m = text.match(/wait\s+(\d+)\s*s/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Remove embedded "wait Ns" so the modal can show a live countdown instead. */
export function stripRetrySecondsFromMessage(message: string): string {
  return message
    .replace(/\s*Please wait \d+s and try again\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function formatRetryCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}:${String(sec).padStart(2, "0")}`;
  return `${sec}s`;
}
