/**
 * All counseling session wall-clock times in Firestore (`finalSlot` / `preferredTimeFromStudent`
 * strings) are interpreted as civil time in this zone unless a doc has legacy data without
 * `scheduledStartAt` (clients fall back to string parsing).
 */
export const SESSION_SCHEDULING_TIMEZONE = "Asia/Manila";
