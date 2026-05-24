import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  getStudentCounselingOutcomeCountsTrustedCallable,
  type StudentCounselingOutcomeCounts,
} from "./trusted-backend.service";
import { firestoreService } from "./firebase-firestore.service";

async function countStudentCounselingOutcomesFromFirestore(
  counselorId: string,
  studentId: string,
): Promise<StudentCounselingOutcomeCounts> {
  const snap = await getDocs(
    query(collection(db, "sessions"), where("studentId", "==", studentId)),
  );

  let completed = 0;
  let missed = 0;
  let withYouCompleted = 0;
  let withYouMissed = 0;

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const st = String(data.status ?? "");
    const isMine = String(data.counselorId ?? "") === counselorId;

    if (st === "completed") {
      completed += 1;
      if (isMine) withYouCompleted += 1;
    } else if (st === "missed") {
      missed += 1;
      if (isMine) withYouMissed += 1;
    }
  });

  return { completed, missed, withYouCompleted, withYouMissed };
}

/**
 * Lifetime completed/missed totals for a student (all counselors).
 * Cloud Function first; Firestore query when callable auth/deploy fails.
 */
export async function getStudentCounselingOutcomeCounts(
  counselorId: string,
  studentId: string,
): Promise<StudentCounselingOutcomeCounts> {
  const authUser = auth.currentUser;
  if (authUser) {
    try {
      await authUser.getIdToken();
      return await getStudentCounselingOutcomeCountsTrustedCallable(studentId);
    } catch (e) {
      console.warn(
        "[Counseling history] getStudentCounselingOutcomeCountsTrusted failed — using Firestore fallback.",
        e,
      );
    }
  }

  try {
    return await countStudentCounselingOutcomesFromFirestore(
      counselorId,
      studentId,
    );
  } catch (firestoreErr) {
    console.warn("[Counseling history] Firestore fallback failed.", firestoreErr);
    const withYou =
      await firestoreService.getSessionOutcomeCountsForCounselorStudent(
        counselorId,
        studentId,
      );
    return {
      completed: withYou.completed,
      missed: withYou.missed,
      withYouCompleted: withYou.completed,
      withYouMissed: withYou.missed,
    };
  }
}
