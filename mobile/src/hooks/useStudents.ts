import { useMemo } from 'react';

export function useStudents() {
    const students = useMemo(() => [], []);
    return { students, loading: false };
}
