import { create } from "zustand";

export interface MessageContact {
  id: string;
  name: string;
  preview: string;
  time: string;
  avatar: string;
  isOnline: boolean;
  isUnread: boolean;
  program?: string;
  studentId?: string;
  /** Firestore conversation doc ID (counselorId_studentId) */
  conversationId?: string;
  /** Hidden from counselor inbox via archive (only set when includeArchived fetch). */
  isArchived?: boolean;
}

interface MessagesContactStore {
  contacts: MessageContact[];
  setContacts: (contacts: MessageContact[]) => void;
  addContact: (
    contact: Omit<
      MessageContact,
      "preview" | "time" | "isOnline" | "isUnread"
    > &
      Partial<Pick<MessageContact, "preview" | "time">>,
  ) => void;
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
        preview: contact.preview ?? "No messages yet",
        time: contact.time ?? "Just now",
        isOnline: false,
        isUnread: false,
      };
      return { contacts: [full, ...state.contacts] };
    }),
}));
