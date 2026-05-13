export function stressCategoryLabelFromFive(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return 'Not enough stress data'
  if (score <= 1.8) return 'Very calm'
  if (score <= 2.6) return 'Normal'
  if (score <= 3.5) return 'Stressed'
  return 'Very stressed'
}

export function energyCategoryLabelFromFive(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return 'Not enough energy data'
  if (score <= 1.8) return 'Very low energy'
  if (score <= 2.6) return 'Low energy'
  if (score <= 3.5) return 'Steady energy'
  return 'High energy'
}