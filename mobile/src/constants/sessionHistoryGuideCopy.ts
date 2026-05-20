import type { InfoGuideContent } from "../components/common/InfoGuideModal";

export const SESSION_HISTORY_GUIDE: InfoGuideContent = {
  title: "Session History",
  body:
    "This list is your full counseling history — every session you handled, including before a college change. Each row shows an agreed or proposed time and a badge:\n\n" +
    "• UPCOMING — confirmed time on a later date.\n" +
    "• TODAY — scheduled for today (before the time passes).\n" +
    "• RESCHEDULE NEEDED — the scheduled time passed within the last 24 hours and no outcome is recorded yet.\n" +
    "• EXPIRED — more than 24 hours past the scheduled time with no outcome yet.\n" +
    "• CANCELLED — the appointment was cancelled.\n\n" +
    "Completed and did not attend (you set these):\n" +
    "After the agreed time passes, tap a row and choose Mark attendance:\n" +
    "• Showed Up → COMPLETED. The session is closed as held.\n" +
    "• Did Not Show Up → DID NOT ATTEND. The student is recorded as not attending; they can request a new time in Messages.\n" +
    "• Needs Rescheduling → the locked time is cleared so you can propose new slots in Messages (badge returns to upcoming when a new time is agreed).\n\n" +
    "Until you mark one of those options, Aurora keeps RESCHEDULE NEEDED (first 24h) then EXPIRED (after 24h). You can still mark attendance on expired rows to close them as completed or did not attend.",
};
