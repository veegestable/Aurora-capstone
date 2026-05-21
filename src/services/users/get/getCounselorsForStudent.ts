import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../../../config/firebase'
import {
  resolveCollegeCodeFromUserData,
  type CollegeCode,
} from '../../../constants/colleges'
import { counselorEligibleForStudent } from '../../../utils/counselorStudentPolicy'
import { getConversationsForStudent } from '../../messages/get/getConversationsForStudent'
import { getSessionsForStudent } from '../../sessions/get/getSessionsForStudent'

async function getVerifiedApprovedCounselorsForCollege(collegeCode: CollegeCode) {
  const byId: Record<string, Record<string, unknown>> = {}
  const collect = (snapshot: Awaited<ReturnType<typeof getDocs>>) => {
    snapshot.docs.forEach((d) => {
      byId[d.id] = { id: d.id, ...(d.data() ?? {}) }
    })
  }

  const approvedCounselors = query(
    collection(db, 'users'),
    where('role', '==', 'counselor'),
    where('email_verified', '==', true),
    where('approval_status', '==', 'approved'),
    where('college_code', '==', collegeCode),
  )
  collect(await getDocs(approvedCounselors))

  const approvedCounselorsLegacyRole = query(
    collection(db, 'users'),
    where('role', '==', 'Counselor'),
    where('email_verified', '==', true),
    where('approval_status', '==', 'approved'),
    where('college_code', '==', collegeCode),
  )
  collect(await getDocs(approvedCounselorsLegacyRole))

  return Object.values(byId)
}

export interface CounselorPickerRow {
  id: string
  full_name?: string
  avatar_url?: string
}

/**
 * Counselor picker for students (matches mobile + Firestore directory rules).
 */
export async function getCounselorsForStudent(
  studentId: string,
): Promise<CounselorPickerRow[]> {
  const byId: Record<string, CounselorPickerRow> = {}
  const add = (raw: Record<string, unknown> | null | undefined) => {
    if (!raw) return
    const id = String(raw.id ?? '').trim()
    if (!id) return
    byId[id] = {
      id,
      full_name:
        typeof raw.full_name === 'string'
          ? raw.full_name
          : typeof raw.preferred_name === 'string'
            ? raw.preferred_name
            : undefined,
      avatar_url:
        typeof raw.avatar_url === 'string' ? raw.avatar_url : undefined,
    }
  }

  let studentCollege: CollegeCode | '' = ''
  if (studentId) {
    try {
      const ss = await getDoc(doc(db, 'users', studentId))
      if (ss.exists()) {
        studentCollege = resolveCollegeCodeFromUserData(
          (ss.data() ?? {}) as Record<string, unknown>,
        )
      }
    } catch {
      /* ignore */
    }
  }

  const maybeAddCounselor = (row: Record<string, unknown>) => {
    if (!counselorEligibleForStudent(row, studentCollege)) return
    add(row)
  }

  if (studentCollege) {
    try {
      const roleCounselors =
        await getVerifiedApprovedCounselorsForCollege(studentCollege)
      roleCounselors.forEach(maybeAddCounselor)
    } catch (e) {
      console.warn('[users] getCounselorsForStudent college query failed:', e)
    }
  }

  const linkedCounselorIds = new Set<string>()

  try {
    const sessions = await getSessionsForStudent(studentId)
    sessions.forEach((s) => {
      const cid = String(s.counselorId ?? '').trim()
      if (cid) linkedCounselorIds.add(cid)
    })
  } catch {
    /* ignore */
  }

  try {
    const conversations = await getConversationsForStudent(studentId, {
      activeCollegeCode: studentCollege,
    })
    conversations.forEach((c) => {
      const cid = String(c.id ?? '').trim()
      if (cid) linkedCounselorIds.add(cid)
    })
  } catch {
    /* ignore */
  }

  if (linkedCounselorIds.size > 0) {
    await Promise.all(
      [...linkedCounselorIds].map(async (cid) => {
        if (byId[cid]) return
        try {
          const snap = await getDoc(doc(db, 'users', cid))
          if (!snap.exists()) return
          const candidate = { id: cid, ...(snap.data() ?? {}) } as Record<
            string,
            unknown
          >
          if (!counselorEligibleForStudent(candidate, studentCollege)) return
          add(candidate)
        } catch {
          /* ignore */
        }
      }),
    )
  }

  return Object.values(byId).sort((a, b) =>
    String(a.full_name ?? '')
      .toLowerCase()
      .localeCompare(String(b.full_name ?? '').toLowerCase()),
  )
}
