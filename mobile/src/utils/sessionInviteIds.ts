/**
 * Resolves the real Firestore `sessions/{id}` for session_invite chat messages.
 * Never use the message document's root `sessionId` — after `sendSessionMessage` it is the *chat message* doc id.
 */
export function resolveSessionsDocIdFromInviteMessageData(data: Record<string, unknown>): string {
    const session = (data.sessionData ?? data.session ?? {}) as Record<string, unknown>;
    const fromNested =
        (session.id != null && String(session.id).trim()) ||
        (session.sessionId != null && String(session.sessionId).trim()) ||
        '';
    const linked =
        data.linkedSessionId != null && String(data.linkedSessionId).trim()
            ? String(data.linkedSessionId).trim()
            : '';
    return (fromNested || linked || '').trim();
}

export function isPlaceholderSessionDocId(id: string): boolean {
    return !id || id.startsWith('session_');
}

/** Same id resolution as merged `SessionCard` payloads after `_getMessages`. */
export function resolveSessionsDocIdForSessionCard(session: {
    id?: unknown;
    linkedSessionId?: unknown;
    sessionId?: unknown;
}): string {
    const raw =
        String(session.id ?? '').trim() ||
        String(session.linkedSessionId ?? '').trim() ||
        String(session.sessionId ?? '').trim();
    if (isPlaceholderSessionDocId(raw)) return '';
    return raw;
}
