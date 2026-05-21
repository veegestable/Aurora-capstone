import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase-firestore/db'
import {
  resolveCollegeCodeFromUserData,
  type CollegeCode,
} from '../../../constants/colleges'
import {
  conversationMatchesActiveCollege,
  sameResolvedCollege,
} from '../../../utils/counselorStudentPolicy'
import { getConversationsForCounselor } from '../../messages/get/getConversationsForCounselor'
import { getSessionsForCounselor } from '../../sessions/get/getSessionsForCounselor'
import { getVerifiedStudentsForCollege } from './getVerifiedStudentsForCollege'
import type { StudentInfo } from '../types'

function toStudentInfo(row: Record<string, unknown>): StudentInfo {
  const id = String(row.id ?? '').trim()
  return {
    id,
    full_name:
      typeof row.full_name === 'string'
        ? row.full_name
        : typeof row.displayName === 'string'
          ? row.displayName
          : 'Unknown Student',
    email: typeof row.email === 'string' ? row.email : '',
    role: 'student',
    program: typeof row.program === 'string' ? row.program : undefined,
    yearLevel:
      typeof row.year_level === 'string'
        ? row.year_level
        : typeof row.yearLevel === 'string'
          ? row.yearLevel
          : undefined,
    department:
      typeof row.department === 'string' ? row.department : undefined,
    avatar_url:
      typeof row.avatar_url === 'string' && row.avatar_url.trim()
        ? row.avatar_url.trim()
        : undefined,
  }
}

/**
 * Counselor "Write a message" list (mobile `getStudentsForCounselor`).
 * Verified students in active college + linked roster from current-college threads.
 */
export async function getStudentsForCounselor(
  counselorId: string,
  options?: { activeCollegeCode?: string | null },
): Promise<StudentInfo[]> {
  const byId: Record<string, StudentInfo> = {}
  const add = (raw: Record<string, unknown> | null | undefined) => {
    if (!raw) return
    const id = String(raw.id ?? '').trim()
    if (!id) return
    byId[id] = toStudentInfo({ ...raw, id })
  }

  let counselorCollege: CollegeCode | '' = (options?.activeCollegeCode ?? '').trim() as CollegeCode | ''
  if (!counselorCollege && counselorId) {
    try {
      const csnap = await getDoc(doc(db, 'users', counselorId))
      if (csnap.exists()) {
        counselorCollege = resolveCollegeCodeFromUserData(
          (csnap.data() ?? {}) as Record<string, unknown>,
        )
      }
    } catch {
      counselorCollege = ''
    }
  }

  const maybeAddVerified = (row: Record<string, unknown>) => {
    if (!counselorCollege) return
    if (sameResolvedCollege(row, { college_code: counselorCollege })) {
      add(row)
    }
  }

  if (counselorCollege) {
    try {
      const verified = await getVerifiedStudentsForCollege(counselorCollege)
      verified.forEach(maybeAddVerified)
    } catch {
      /* keep going */
    }
  }

  const linkedIds = new Set<string>()
  try {
    const convos = await getConversationsForCounselor(counselorId, {
      activeCollegeCode: counselorCollege || undefined,
    })
    convos.forEach((c) => {
      const sid = String(c.id ?? c.studentId ?? '').trim()
      if (sid) linkedIds.add(sid)
    })
  } catch {
    /* ignore */
  }

  try {
    const sessions = await getSessionsForCounselor(counselorId)
    sessions.forEach((s) => {
      const data = s as unknown as Record<string, unknown>
      if (
        counselorCollege &&
        !conversationMatchesActiveCollege(data, counselorCollege)
      ) {
        return
      }
      const sid = String(data.studentId ?? '').trim()
      if (sid) linkedIds.add(sid)
    })
  } catch {
    /* ignore */
  }

  if (linkedIds.size > 0) {
    await Promise.all(
      [...linkedIds].map(async (sid) => {
        if (byId[sid]) return
        try {
          const snap = await getDoc(doc(db, 'users', sid))
          if (!snap.exists()) return
          const data = (snap.data() ?? {}) as Record<string, unknown>
          const role = String(data.role ?? '').toLowerCase()
          if (role !== 'student') return
          const row = { id: sid, ...data }
          if (
            counselorCollege &&
            !sameResolvedCollege(row, { college_code: counselorCollege })
          ) {
            return
          }
          add(row)
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
