import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../config/firebase'
import {
  getCollegeName,
  isCollegeCode,
  resolveCollegeCodeFromUserData,
  type CollegeCode,
} from '../../constants/colleges'
import { isProgramInCollege } from '../../constants/college-programs-iit'
import { conversationCollegeTag } from '../../utils/counselorStudentPolicy'
import { fetchUserCollegeMap } from '../messages/helpers/fetchUserCollegeMap'

export type ConversationCollegeRepairResult = {
  collegeCode: CollegeCode
  scanned: number
  repaired: number
  alreadyCorrect: number
  skippedNotAligned: number
  failed: number
}

async function stampParticipantConversationsWithCollege(
  uid: string,
  collegeCode: CollegeCode,
): Promise<void> {
  const seen = new Set<string>()
  const toUpdate: ReturnType<typeof doc>[] = []

  const collect = (snapshot: Awaited<ReturnType<typeof getDocs>>) => {
    snapshot.docs.forEach((d) => {
      if (seen.has(d.id)) return
      seen.add(d.id)
      const data = d.data() as Record<string, unknown>
      if (conversationCollegeTag(data)) return
      toUpdate.push(doc(db, 'conversations', d.id))
    })
  }

  try {
    const [asCounselor, asStudent] = await Promise.all([
      getDocs(query(collection(db, 'conversations'), where('counselorId', '==', uid))),
      getDocs(query(collection(db, 'conversations'), where('studentId', '==', uid))),
    ])
    collect(asCounselor)
    collect(asStudent)
  } catch (e) {
    console.warn('[conversations] college stamp query failed:', e)
    return
  }

  await Promise.all(
    toUpdate.map((ref) =>
      updateDoc(ref, { college_code: collegeCode, updated_at: new Date() }).catch(() => {}),
    ),
  )
}

async function stampParticipantSessionsWithCollege(
  uid: string,
  collegeCode: CollegeCode,
): Promise<void> {
  const seen = new Set<string>()
  const toUpdate: ReturnType<typeof doc>[] = []

  const collect = (snapshot: Awaited<ReturnType<typeof getDocs>>) => {
    snapshot.docs.forEach((d) => {
      if (seen.has(d.id)) return
      seen.add(d.id)
      const data = d.data() as Record<string, unknown>
      if (conversationCollegeTag(data)) return
      toUpdate.push(doc(db, 'sessions', d.id))
    })
  }

  try {
    const [asCounselor, asStudent] = await Promise.all([
      getDocs(query(collection(db, 'sessions'), where('counselorId', '==', uid))),
      getDocs(query(collection(db, 'sessions'), where('studentId', '==', uid))),
    ])
    collect(asCounselor)
    collect(asStudent)
  } catch (e) {
    console.warn('[sessions] college stamp query failed:', e)
    return
  }

  await Promise.all(
    toUpdate.map((ref) =>
      updateDoc(ref, { college_code: collegeCode, updated_at: new Date() }).catch(() => {}),
    ),
  )
}

async function reactivateConversationsForUserCollege(
  uid: string,
  collegeCode: CollegeCode,
): Promise<ConversationCollegeRepairResult> {
  const result: ConversationCollegeRepairResult = {
    collegeCode,
    scanned: 0,
    repaired: 0,
    alreadyCorrect: 0,
    skippedNotAligned: 0,
    failed: 0,
  }

  const seen = new Set<string>()
  const convRefs: ReturnType<typeof doc>[] = []

  const collect = (snapshot: Awaited<ReturnType<typeof getDocs>>) => {
    snapshot.docs.forEach((d) => {
      if (seen.has(d.id)) return
      seen.add(d.id)
      convRefs.push(doc(db, 'conversations', d.id))
    })
  }

  try {
    const [asCounselor, asStudent] = await Promise.all([
      getDocs(query(collection(db, 'conversations'), where('counselorId', '==', uid))),
      getDocs(query(collection(db, 'conversations'), where('studentId', '==', uid))),
    ])
    collect(asCounselor)
    collect(asStudent)
  } catch (e) {
    console.warn('[conversations] reactivate college query failed:', e)
    return result
  }

  result.scanned = convRefs.length

  for (const ref of convRefs) {
    try {
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        result.failed += 1
        continue
      }
      const data = snap.data() as Record<string, unknown>
      const counselorId = String(data.counselorId ?? '')
      const studentId = String(data.studentId ?? '')
      if (!counselorId || !studentId) {
        result.failed += 1
        continue
      }
      const collegeMap = await fetchUserCollegeMap([counselorId, studentId])
      const counselorCollege = collegeMap[counselorId] ?? ''
      const studentCollege = collegeMap[studentId] ?? ''
      if (counselorCollege !== collegeCode || studentCollege !== collegeCode) {
        result.skippedNotAligned += 1
        continue
      }
      const tag = conversationCollegeTag(data)
      if (tag === collegeCode) {
        result.alreadyCorrect += 1
        continue
      }
      await updateDoc(ref, { college_code: collegeCode, updated_at: new Date() })
      result.repaired += 1
    } catch {
      result.failed += 1
    }
  }

  return result
}

export async function getUsersWithPendingCollegeShifts(): Promise<
  Array<Record<string, unknown> & { id: string }>
> {
  const q = query(collection(db, 'users'), where('college_shift_pending', '==', true))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() ?? {}),
  })) as Array<Record<string, unknown> & { id: string }>
}

export async function adminApproveCollegeShift(uid: string): Promise<void> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) throw new Error('User not found.')
  const data = (snap.data() ?? {}) as Record<string, unknown>
  const req = data.college_shift_request as
    | { requested_college_code?: unknown; requested_program?: unknown }
    | undefined
  const nextCode = req?.requested_college_code
  if (!isCollegeCode(nextCode)) {
    throw new Error('No valid pending college request for this user.')
  }
  const nextProgram =
    typeof req?.requested_program === 'string' ? req.requested_program.trim() : ''
  const role = data.role
  const isStudent = role === 'student'
  const previousCollege = resolveCollegeCodeFromUserData(data)
  if (previousCollege) {
    await Promise.all([
      stampParticipantConversationsWithCollege(uid, previousCollege),
      stampParticipantSessionsWithCollege(uid, previousCollege),
    ])
  }
  if (isStudent) {
    if (!nextProgram || !isProgramInCollege(nextCode, nextProgram)) {
      throw new Error(
        'This pending request is missing a valid program. Reject it and ask the student to submit again.',
      )
    }
    await updateDoc(doc(db, 'users', uid), {
      college_code: nextCode,
      program: nextProgram,
      college_shift_request: deleteField(),
      college_shift_pending: false,
      updated_at: new Date(),
    })
    await reactivateConversationsForUserCollege(uid, nextCode)
    return
  }
  await updateDoc(doc(db, 'users', uid), {
    college_code: nextCode,
    college_shift_request: deleteField(),
    college_shift_pending: false,
    updated_at: new Date(),
  })
  await reactivateConversationsForUserCollege(uid, nextCode)
}

export async function adminRejectCollegeShift(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    college_shift_request: deleteField(),
    college_shift_pending: false,
    updated_at: new Date(),
  })
}

export async function findUserByEmailForAdmin(
  email: string,
): Promise<(Record<string, unknown> & { id: string }) | null> {
  const trimmed = email.trim()
  if (!trimmed) return null
  const candidates = [trimmed.toLowerCase(), trimmed]
  const seen = new Set<string>()
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue
    seen.add(candidate)
    try {
      const snap = await getDocs(
        query(collection(db, 'users'), where('email', '==', candidate), limit(1)),
      )
      if (snap.empty) continue
      const docSnap = snap.docs[0]
      return { id: docSnap.id, ...(docSnap.data() as Record<string, unknown>) }
    } catch {
      // try next casing
    }
  }
  return null
}

export async function adminRepairConversationCollegeTags(
  uid: string,
): Promise<ConversationCollegeRepairResult> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) throw new Error('User not found.')
  const college = resolveCollegeCodeFromUserData((snap.data() ?? {}) as Record<string, unknown>)
  if (!college || !isCollegeCode(college)) {
    throw new Error('User has no college on their profile. Set or approve a college first.')
  }
  return reactivateConversationsForUserCollege(uid, college)
}

export function formatRepairSummary(r: ConversationCollegeRepairResult): string {
  return [
    `College: ${r.collegeCode} (${getCollegeName(r.collegeCode)})`,
    `Threads scanned: ${r.scanned}`,
    `Tags repaired: ${r.repaired}`,
    `Already correct: ${r.alreadyCorrect}`,
    `Skipped (participants not both in this college): ${r.skippedNotAligned}`,
    r.failed > 0 ? `Failed: ${r.failed}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}
