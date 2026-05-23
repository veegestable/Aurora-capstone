const hiddenKey = (counselorId: string) =>
  `aurora.counselorSessionsSheet.hidden:${counselorId}`

export function loadHiddenCounselorSheetSessionIds(counselorId: string): string[] {
  try {
    const raw = localStorage.getItem(hiddenKey(counselorId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : []
  } catch {
    return []
  }
}

export function saveHiddenCounselorSheetSessionIds(
  counselorId: string,
  ids: string[],
): void {
  localStorage.setItem(hiddenKey(counselorId), JSON.stringify(ids))
}
