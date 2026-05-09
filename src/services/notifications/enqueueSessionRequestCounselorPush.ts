/**
 * Notifies counselor mobile (SessionNotificationBridge) when a student requests a session from web.
 * Mirrors mobile `addSessionRequestToConversation` → `createSessionNotification`.
 */
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export async function enqueueSessionRequestCounselorPush(
  counselorId: string,
  sessionFirestoreId: string,
  preferredTime?: string,
): Promise<void> {
  try {
    const preferredTimeStr = preferredTime?.trim() ?? '';
    const message = preferredTimeStr
      ? `A student requested a counseling session for ${preferredTimeStr}.`
      : 'A student requested a counseling session.';
    const key = `session:${sessionFirestoreId}:student_request_created`.toLowerCase();

    const recentQuery = query(
      collection(db, 'notifications'),
      where('user_id', '==', counselorId),
      where('type', '==', 'counselor_message'),
      where('notification_key', '==', key),
      orderBy('created_at', 'desc'),
      limit(1),
    );
    const recentSnap = await getDocs(recentQuery);
    const lastCreatedAt = recentSnap.docs[0]?.data()?.created_at?.toDate?.() as
      | Date
      | undefined;
    if (lastCreatedAt && Date.now() - lastCreatedAt.getTime() < 10 * 60 * 1000) return;

    await addDoc(collection(db, 'notifications'), {
      user_id: counselorId,
      type: 'counselor_message',
      message,
      status: 'pending',
      delivery_mode: 'local_bridge',
      notification_key: key,
      target_route: '/(counselor)/messages',
      scheduled_for: Timestamp.now(),
      created_at: Timestamp.now(),
    });
  } catch (e) {
    console.warn('Could not enqueue session request counselor notification:', e);
  }
}
