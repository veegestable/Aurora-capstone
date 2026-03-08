export function formatSchoolYear(startYear: number): string {
    return `${startYear}-${startYear + 1}`;
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.toDateString() === b.toDateString();
}
