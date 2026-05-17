import { FirebaseError } from "firebase/app";
import { toUserFacingEmailAuthError } from "./firebase-auth-errors";
import {
  getRetryAfterSecondsFromError,
  stripRetrySecondsFromMessage,
} from "./rateLimitError";

export type SignUpTrustedErrorResult = {
  message: string;
  retryAfterSeconds: number | null;
};

export function shouldFallbackToClientSignUp(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) return false;
  return (
    error.code === "functions/not-found" ||
    error.code === "functions/unimplemented" ||
    error.code === "functions/internal"
  );
}

export function toUserFacingSignUpTrustedErrorResult(
  err: unknown,
): SignUpTrustedErrorResult {
  const retryAfterSeconds = getRetryAfterSecondsFromError(err);
  if (err instanceof FirebaseError) {
    if (err.code === "functions/resource-exhausted") {
      const raw =
        err.message ||
        "Too many sign-up attempts. Please wait and try again.";
      return {
        message: stripRetrySecondsFromMessage(raw),
        retryAfterSeconds,
      };
    }
    if (err.code === "functions/already-exists") {
      return {
        message:
          err.message ||
          "An account with this email already exists. Try signing in instead.",
        retryAfterSeconds: null,
      };
    }
    if (err.code === "functions/invalid-argument") {
      return {
        message:
          err.message || "Please check your sign-up details and try again.",
        retryAfterSeconds: null,
      };
    }
    if (err.code === "functions/unavailable") {
      return {
        message:
          err.message ||
          "Could not complete registration right now. Please try again later.",
        retryAfterSeconds: null,
      };
    }
  }
  const fallback = toUserFacingEmailAuthError(err);
  return {
    message: stripRetrySecondsFromMessage(fallback.message),
    retryAfterSeconds: getRetryAfterSecondsFromError(fallback),
  };
}

export function toUserFacingSignUpTrustedError(err: unknown): Error {
  const { message } = toUserFacingSignUpTrustedErrorResult(err);
  return new Error(message);
}
