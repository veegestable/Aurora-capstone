export type Sex = 'male' | 'female';

export interface Student {
    id: string;
    userId: string;
    studentNumber: string;
    programId: string;
    sectionId: string;
    yearLevel: number;
    /** Used for future features (e.g. reporting, analytics). */
    sex?: Sex;
}
