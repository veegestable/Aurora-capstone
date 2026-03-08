export function isMsuIitCcsEmail(email: string): boolean {
    const normalized = email.trim().toLowerCase();
    return normalized.endsWith('@g.msuiit.edu.ph') || normalized.endsWith('@msuiit.edu.ph');
}
