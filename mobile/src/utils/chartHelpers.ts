export function normalizeSeries(values: number[]): number[] {
    if (values.length === 0) return [];
    const max = Math.max(...values);
    if (max === 0) return values.map(() => 0);
    return values.map((value) => value / max);
}
