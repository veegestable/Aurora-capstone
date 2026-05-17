/**
 * Scheduled cleanup: remove stale unverified Firebase Auth accounts (fake @g.msuiit.edu.ph, bots).
 *
 * Skips: verified users, SIGNUP_EMAIL_ALLOWLIST, Firestore role admin/counselor, custom claim admin.
 * Env: UNVERIFIED_AUTH_CLEANUP_GRACE_HOURS (default 72), UNVERIFIED_AUTH_CLEANUP_DISABLED=true to skip.
 */

import * as admin from 'firebase-admin';
import type { UserRecord } from 'firebase-admin/auth';
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { isSignupEmailAllowlisted } from './signupEmailPolicy';

const DEFAULT_GRACE_HOURS = 72;
const MIN_GRACE_HOURS = 24;
const MAX_GRACE_HOURS = 24 * 30;
function parseGraceHours(): number {
  const raw = process.env.UNVERIFIED_AUTH_CLEANUP_GRACE_HOURS?.trim();
  if (!raw) return DEFAULT_GRACE_HOURS;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_GRACE_HOURS;
  return Math.max(MIN_GRACE_HOURS, Math.min(MAX_GRACE_HOURS, Math.floor(n)));
}

function isCleanupDisabled(): boolean {
  return process.env.UNVERIFIED_AUTH_CLEANUP_DISABLED === 'true';
}

function authUserCreatedMs(user: UserRecord): number {
  const created = user.metadata.creationTime;
  if (!created) return Date.now();
  const ms = new Date(created).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

function normalizeRole(role: unknown): string | null {
  if (typeof role !== 'string') return null;
  const r = role.trim().toLowerCase();
  return r || null;
}

export type CleanupSkipReason =
  | 'verified'
  | 'allowlist'
  | 'admin_claim'
  | 'role_admin'
  | 'role_counselor'
  | 'too_recent';

export function getCleanupSkipReason(
  user: UserRecord,
  firestoreRole: string | null,
  cutoffMs: number,
): CleanupSkipReason | null {
  if (user.emailVerified) return 'verified';

  const email = (user.email ?? '').trim().toLowerCase();
  if (email && isSignupEmailAllowlisted(email)) return 'allowlist';

  if (user.customClaims?.admin === true) return 'admin_claim';

  const role = firestoreRole ?? '';
  if (role === 'admin') return 'role_admin';
  if (role === 'counselor') return 'role_counselor';

  if (authUserCreatedMs(user) > cutoffMs) return 'too_recent';

  return null;
}

async function deleteAuthUserAndProfile(
  uid: string,
  db: admin.firestore.Firestore,
): Promise<void> {
  try {
    await db.collection('users').doc(uid).delete();
  } catch (err) {
    logger.warn('[cleanupUnverified] users doc delete failed', { uid, err });
  }
  try {
    await db.collection('userSettings').doc(uid).delete();
  } catch {
    /* profile settings may not exist */
  }
  await admin.auth().deleteUser(uid);
}

export async function runUnverifiedAuthCleanup(): Promise<{
  scanned: number;
  deleted: number;
  skipped: Record<string, number>;
  errors: number;
}> {
  const graceHours = parseGraceHours();
  const cutoffMs = Date.now() - graceHours * 60 * 60 * 1000;
  const db = admin.firestore();
  const auth = admin.auth();

  const skipped: Record<string, number> = {};
  const bumpSkip = (reason: CleanupSkipReason) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
  };

  let scanned = 0;
  let deleted = 0;
  let errors = 0;
  let pageToken: string | undefined;

  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      scanned++;
      const roleSnap = await db.collection('users').doc(user.uid).get();
      const firestoreRole = roleSnap.exists
        ? normalizeRole(roleSnap.data()?.role)
        : null;

      const skipReason = getCleanupSkipReason(user, firestoreRole, cutoffMs);
      if (skipReason) {
        bumpSkip(skipReason);
        continue;
      }

      try {
        await deleteAuthUserAndProfile(user.uid, db);
        deleted++;
        logger.info('[cleanupUnverified] deleted', {
          uid: user.uid,
          email: user.email ?? null,
        });
      } catch (err) {
        errors++;
        logger.error('[cleanupUnverified] delete failed', {
          uid: user.uid,
          email: user.email ?? null,
          err,
        });
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  return { scanned, deleted, skipped, errors };
}

export const cleanupUnverifiedAuthUsers = onSchedule(
  {
    schedule: 'every 24 hours',
    region: 'asia-southeast2',
    timeZone: 'Asia/Manila',
  },
  async () => {
    if (isCleanupDisabled()) {
      logger.info('[cleanupUnverified] skipped (UNVERIFIED_AUTH_CLEANUP_DISABLED=true)');
      return;
    }

    const graceHours = parseGraceHours();
    logger.info('[cleanupUnverified] starting', { graceHours });

    const result = await runUnverifiedAuthCleanup();

    logger.info('[cleanupUnverified] finished', {
      graceHours,
      ...result,
    });
  },
);
