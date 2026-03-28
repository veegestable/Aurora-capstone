import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { CounselorApprovalStatus } from '../../../types/user.types'

export async function updateCounselorApproval(
  uid: string,
  approvalStatus: CounselorApprovalStatus
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    approval_status: approvalStatus,
    updated_at: new Date()
  })
}