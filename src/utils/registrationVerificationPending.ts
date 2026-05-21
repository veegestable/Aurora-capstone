const STORAGE_KEY = 'aurora_registration_verify_email'

export function readRegistrationVerificationPendingEmail(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY)?.trim().toLowerCase()
    return value || null
  } catch {
    return null
  }
}

export function writeRegistrationVerificationPendingEmail(
  email: string | null,
): void {
  try {
    const trimmed = email?.trim().toLowerCase() || null
    if (trimmed) sessionStorage.setItem(STORAGE_KEY, trimmed)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* private mode / disabled storage */
  }
}
