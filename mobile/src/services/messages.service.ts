export interface MessageRecord {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
}

export const messagesService = {
    async listByUser(_userId: string): Promise<MessageRecord[]> {
        return [];
    },
};
