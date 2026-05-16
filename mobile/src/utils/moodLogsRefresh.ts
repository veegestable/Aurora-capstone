type MoodLogsRefreshListener = () => void;

const listeners = new Set<MoodLogsRefreshListener>();

/** Subscribe to mood log saves (e.g. Analytics reload). Returns unsubscribe. */
export function subscribeMoodLogsRefresh(
  listener: MoodLogsRefreshListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Call after a mood check-in is persisted so analytics can reload. */
export function notifyMoodLogsRefresh(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (e) {
      console.warn("[moodLogsRefresh] listener failed", e);
    }
  }
}
