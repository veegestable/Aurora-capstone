export interface Announcement {
    id: string;
    title: string;
    content: string;
    targetRole: 'all' | 'counselor' | 'student';
}

export const announcementsService = {
    async listPublished(): Promise<Announcement[]> {
        return [];
    },
};
