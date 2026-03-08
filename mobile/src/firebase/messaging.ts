export interface PushPayload {
    title: string;
    body: string;
    userId: string;
}

export async function sendPushNotification(_payload: PushPayload): Promise<void> {
    return Promise.resolve();
}
