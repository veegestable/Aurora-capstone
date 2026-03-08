export type UserRole = 'admin' | 'counselor' | 'student';

export interface User {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
}
