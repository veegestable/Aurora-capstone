import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { assertMessagingOpenForParticipants } from '../helpers/assertMessagingOpen'

function toMs(v: unknown): number {
  if (v == null) return 0
  if (typeof (v as { toMillis?: () => number }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis()
  }
  if (typeof (v as { seconds?: number }).seconds === 'number') {
    return (v as { seconds: number }).seconds * 1000
  }
  return 0
}

/** Update the newest session_invite card for a session (mobile parity). */
export async function updateSessionInviteForSession(
  conversationId: string,
  senderId: string,
  sessionId: string,
  sessionData: Record<string, unknown>,
): Promise<void> {
  const parts = conversationId.split('_')
  const studentId = parts[1] ?? ''
  await assertMessagingOpenForParticipants(senderId, studentId, senderId)

  const messagesRef = collection(db, 'conversations', conversationId, 'messages')
  const snapshot = await getDocs(query(messagesRef, where('linkedSessionId', '==', sessionId)))

  const inviteDocs = snapshot.docs.filter((d) => {
    const data = d.data()
    return data.type === 'session_invite' && data.senderId === senderId
  })

  if (inviteDocs.length === 0) {
    const msgRef = doc(messagesRef)
    const convRef = doc(db, 'conversations', conversationId)
    const now = Timestamp.now()
    const convSnap = await getDoc(convRef)
    const unreadStudent = convSnap.data()?.unreadCountStudent ?? 0
    const batch = writeBatch(db)
    batch.set(msgRef, {
      senderId,
      content: `Session: ${String(sessionData.title ?? 'Counseling Session')}`,
      type: 'session_invite',
      sessionId,
      linkedSessionId: sessionId,
      sessionData,
      isRead: false,
      readAt: null,
      isUrgent: false,
      createdAt: now,
    })
    batch.update(convRef, {
      lastMessage: `Session: ${String(sessionData.title ?? 'Counseling Session')}`,
      lastMessageAt: now,
      lastSenderId: senderId,
      unreadCountStudent: (typeof unreadStudent === 'number' ? unreadStudent : 0) + 1,
    })
    await batch.commit()
    return
  }

  const keepDoc = inviteDocs
    .slice()
    .sort((a, b) => toMs(b.data().createdAt) - toMs(a.data().createdAt))[0]

  await Promise.all(
    inviteDocs.filter((d) => d.id !== keepDoc.id).map((d) => deleteDoc(d.ref)),
  )

  await updateDoc(keepDoc.ref, {
    sessionData,
    content: `Session: ${String(sessionData.title ?? 'Counseling Session')}`,
  })
}
