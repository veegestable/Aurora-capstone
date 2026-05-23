import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { assertMessagingOpenForParticipants } from '../../messages/helpers/assertMessagingOpen'
import { grantJournalAccessToCounselor } from '../../user-settings/put/grantJournalAccessToCounselor'
import { SESSION_SCHEDULING_TIMEZONE } from '../../../constants/session-scheduling'
import { parseSessionSlotToMillisManila } from '../../../utils/sessionSlotAuthority'
import { messagesService } from '../../messages'

const AUTO_ACCEPTED_PREFIX = '__AUTO_ACCEPTED__'

function schedulingPatch(slot: { date: string; time: string }) {
  const startMs = parseSessionSlotToMillisManila(slot)
  if (startMs == null) return {}
  return {
    scheduledStartAt: Timestamp.fromMillis(startMs),
    schedulingTimezone: SESSION_SCHEDULING_TIMEZONE,
  }
}

export async function acceptStudentSessionRequest(
  conversationId: string,
  sessionId: string,
  slot: { date: string; time: string },
  counselorId: string,
  studentId: string,
): Promise<void> {
  await assertMessagingOpenForParticipants(counselorId, studentId, counselorId)

  const sessionRef = doc(db, 'sessions', sessionId)
  const sessionSnap = await getDoc(sessionRef)
  if (!sessionSnap.exists()) throw new Error('Session not found.')
  const session = sessionSnap.data() as Record<string, unknown>
  const resolvedStudentId = String(session.studentId ?? studentId)

  if (resolvedStudentId) {
    await assertMessagingOpenForParticipants(counselorId, resolvedStudentId, counselorId)
    await grantJournalAccessToCounselor(resolvedStudentId, counselorId)
  }

  const messagesRef = collection(db, 'conversations', conversationId, 'messages')
  const messagesSnap = await getDocs(query(messagesRef, orderBy('createdAt', 'asc')))

  const batch = writeBatch(db)
  batch.update(sessionRef, {
    finalSlot: slot,
    confirmedSlot: slot,
    status: 'confirmed',
    slotConfirmedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...schedulingPatch(slot),
  })

  messagesSnap.docs.forEach((d) => {
    const data = d.data()
    if (
      data.type === 'session_request' &&
      (data.sessionId === sessionId || data.sessionData?.sessionId === sessionId)
    ) {
      const existingSessionData = (data.sessionData ?? {}) as Record<string, unknown>
      batch.update(doc(db, 'conversations', conversationId, 'messages', d.id), {
        sessionData: { ...existingSessionData, status: 'confirmed' },
      })
    }
  })

  await batch.commit()

  await messagesService.sendTextMessage(
    conversationId,
    counselorId,
    `${AUTO_ACCEPTED_PREFIX}Your session is scheduled for ${slot.date} at ${slot.time}.`,
  )
}
