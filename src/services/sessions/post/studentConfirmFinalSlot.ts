import { doc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { grantJournalAccessToCounselor } from '../../user-settings/put/grantJournalAccessToCounselor'
import { assertMessagingOpenForParticipants } from '../../messages/helpers/assertMessagingOpen'
import { SESSION_SCHEDULING_TIMEZONE } from '../../../constants/session-scheduling'
import { parseSessionSlotToMillisManila } from '../../../utils/sessionSlotAuthority'

export async function studentConfirmFinalSlot(
  sessionId: string,
  studentId: string, 
  slot: {
    date: string
    time: string
  },
  opts?: {
    conversationId?: string
    counselorId?: string
  }
) {
  const sessionRef = doc(db, 'sessions', sessionId)
  const snap = await getDoc(sessionRef)
  if (!snap.exists()) throw new Error('Session not found')

  const data = snap.data()!
  const uid = String(studentId)

  // Verify Authorization
  let authorized = data.studentId != null && String(data.studentId) === uid

  if (!authorized && data.studentId == null && opts?.conversationId && opts?.counselorId) {
    const convSnap = await getDoc(doc(db, 'conversations', opts.conversationId))
    const conv = convSnap.data()
    
    const counselorOk = String(data.counselorId ?? '') === String(opts.counselorId)
    const studentOk = conv != null && String(conv.studentId ?? '') === uid

    if (counselorOk && studentOk) authorized = true
  }

  if (!authorized) throw new Error('Not authorized')

  const counselorIdForCheck = String(data.counselorId ?? '')
  const studentIdForCheck = String(data.studentId ?? uid)
  if (counselorIdForCheck && studentIdForCheck) {
    await assertMessagingOpenForParticipants(
      counselorIdForCheck,
      studentIdForCheck,
      uid,
    )
  }

  const startMs = parseSessionSlotToMillisManila(slot)
  if (startMs == null) {
    throw new Error('Invalid session time.')
  }

  const patch: { [field: string]: unknown } = {
    finalSlot: slot,
    confirmedSlot: slot,
    status: 'confirmed',
    updatedAt: Timestamp.now(),
    slotConfirmedAt: Timestamp.now(),
    scheduledStartAt: Timestamp.fromMillis(startMs),
    schedulingTimezone: SESSION_SCHEDULING_TIMEZONE,
  }

  if (data.studentId == null) patch.studentId = uid

  await updateDoc(sessionRef, patch)

  // Special Population: student accepting the counselor's slot grants the
  // counselor journal access (mirrors createSessionRequest behavior).
  const counselorIdForGrant = String(data.counselorId ?? '')
  if (counselorIdForGrant) {
    await grantJournalAccessToCounselor(uid, counselorIdForGrant)
  }

  if (opts?.conversationId) {
    const messagesRef = collection(db, 'conversations', opts.conversationId, 'messages')
    const q = query(messagesRef, where('sessionId', '==', sessionId))
    const snapshot = await getDocs(q)
    
    const updates = snapshot.docs.map(messageDoc => {
      const msgData = messageDoc.data()
      if (msgData.type === 'session_invite' || msgData.type === 'session_request') {
        const currentSessionData = msgData.sessionData || {}
        return updateDoc(messageDoc.ref, {
          sessionData: {
            ...currentSessionData,
            sessionStatus: 'confirmed', // This triggers the visual queue in ChatBubble
            agreedSlot: slot            // This populates the text in the visual queue
          }
        })
      }
      return Promise.resolve()
    })

    await Promise.all(updates)
  }
}