export interface ProposedSlot {
  date: string
  time: string
}

export function formatSlotsFromInputs(
  slots: Array<{ date: string; time: string }>,
): ProposedSlot[] {
  return slots
    .filter((s) => s.date && s.time)
    .map((s) => {
      const [y, m, d] = s.date.split('-').map(Number)
      const [hh, mm] = s.time.split(':').map(Number)
      const dateObj = new Date(y, m - 1, d, hh, mm)
      return {
        date: dateObj.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        time: dateObj.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      }
    })
}
