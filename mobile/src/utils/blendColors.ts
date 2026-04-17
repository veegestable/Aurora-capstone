/** Intensity-weighted RGB blend of hex mood colors (analytics, summaries, charts). */
export function blendColors(entries: { color: string; intensity: number }[]): string {
  const valid = entries.filter((e) => e.color && e.intensity > 0);
  const total = valid.reduce((s, e) => s + e.intensity, 0);
  if (total === 0) return entries[0]?.color?.startsWith('#') ? entries[0].color : '#888888';
  const [r, g, b] = valid.reduce(
    ([ar, ag, ab], e) => {
      const weight = e.intensity / total;
      const hex = e.color.replace('#', '').trim();
      if (hex.length < 6) return [ar, ag, ab];
      return [
        ar + parseInt(hex.slice(0, 2), 16) * weight,
        ag + parseInt(hex.slice(2, 4), 16) * weight,
        ab + parseInt(hex.slice(4, 6), 16) * weight,
      ];
    },
    [0, 0, 0]
  );
  return `#${Math.round(r)
    .toString(16)
    .padStart(2, '0')}${Math.round(g)
    .toString(16)
    .padStart(2, '0')}${Math.round(b)
    .toString(16)
    .padStart(2, '0')}`;
}
