export interface CounselorNote {
    id: string;
    counselorId: string;
    studentId: string;
    note: string;
}

export const counselorNotesService = {
    async listByStudent(_studentId: string): Promise<CounselorNote[]> {
        return [];
    },
};
