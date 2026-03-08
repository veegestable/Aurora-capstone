export interface UserRecord {
    id: string;
    email: string;
    role: 'admin' | 'counselor' | 'student';
}

export const usersService = {
    async list(): Promise<UserRecord[]> {
        return [];
    },
};
