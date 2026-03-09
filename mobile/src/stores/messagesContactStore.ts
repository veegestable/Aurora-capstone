import { create } from 'zustand';

export interface MessageContact {
    id: string;
    name: string;
    preview: string;
    time: string;
    avatar: string;
    isOnline: boolean;
    isUnread: boolean;
    isAlerted: boolean;
    borderColor?: string;
    program?: string;
    studentId?: string;
    /** Firestore conversation doc ID (counselorId_studentId) */
    conversationId?: string;
}

interface MessagesContactStore {
    contacts: MessageContact[];
    setContacts: (contacts: MessageContact[]) => void;
    addContact: (contact: Omit<MessageContact, 'preview' | 'time' | 'isOnline' | 'isUnread' | 'isAlerted'> & Partial<Pick<MessageContact, 'preview' | 'time' | 'isAlerted' | 'borderColor'>>) => void;
}

export const useMessagesContactStore = create<MessagesContactStore>((set) => ({
    contacts: [],
    setContacts: (contacts) => set({ contacts }),
    addContact: (contact) =>
        set((state) => {
            const exists = state.contacts.some((c) => c.id === contact.id);
            if (exists) return state;
            const full: MessageContact = {
                ...contact,
                preview: contact.preview ?? 'No messages yet',
                time: contact.time ?? 'Just now',
                isOnline: false,
                isUnread: false,
                isAlerted: contact.isAlerted ?? false,
            };
            return { contacts: [full, ...state.contacts] };
        }),
}));
