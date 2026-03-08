import { create } from 'zustand';
import { UserRole } from '../types/user.types';

interface AuthUser {
    uid: string;
    email: string;
}

interface AuthStoreState {
    user: AuthUser | null;
    role: UserRole | null;
    setUser: (user: AuthUser | null) => void;
    setRole: (role: UserRole | null) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
    user: null,
    role: null,
    setUser: (user) => set({ user }),
    setRole: (role) => set({ role }),
    clearAuth: () => set({ user: null, role: null }),
}));
