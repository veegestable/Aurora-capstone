/**
 * Writes `notifications` docs consumed by the mobile app's SessionNotificationBridge
 * (local scheduled notification → Messages). Web counselor invite previously skipped this.
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

export async function enqueueSessionInviteStudentPush(
  studentId: string,
  sessionFirestoreId: string,
): Promise<void> {
  try {
    const message =
      'Your counselor sent a session invitation. Open Messages to review and confirm your preferred slot.';
    const key = `session:${sessionFirestoreId}:counselor_invite_created`.toLowerCase();

    const recentQuery = query(
      collection(db, 'notifications'),
      where('user_id', '==', studentId),
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
      user_id: studentId,
      type: 'counselor_message',
      message,
      status: 'pending',
      delivery_mode: 'local_bridge',
      notification_key: key,
      target_route: '/(student)/messages',
      scheduled_for: Timestamp.now(),
      created_at: Timestamp.now(),
    });
  } catch (e) {
    console.warn('Could not enqueue session invite notification:', e);
  }
}
