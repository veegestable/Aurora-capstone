/**
 * System messages may prefix visible text with this marker (see mobile AUTO_ACCEPTED_PREFIX)
 * Strip it for conversation previews and on-screen chat text.
 */
export const AUTO_ACCEPTED_PREFIX = "__AUTO_ACCEPTED__"

/** Strp marker for display. If nothing remains, use a friendly fallback. */
export function stripAutoAcceptedPrefix(raw: string): string {
  const t = raw.trim()
  if (!t.startsWith(AUTO_ACCEPTED_PREFIX)) return raw
  const rest = t.slice(AUTO_ACCEPTED_PREFIX.length).trim()
  return rest || "Session accepted"
}

/** For conversation raw preview (`ContactRow`). */
export function formatConversationPreview(lastMessage: unknown): string {
  if (lastMessage == null) return "No messages yet"
  const s = String(lastMessage).trim()
  if (s === '') return "No messages yet"
  return stripAutoAcceptedPrefix(s)
}