export interface StudentRecord {
    id: string;
    userId: string;
    programId: string;
    sectionId: string;
}

export const studentsService = {
    async listAssigned(_counselorId: string): Promise<StudentRecord[]> {
        return [];
    },
};
