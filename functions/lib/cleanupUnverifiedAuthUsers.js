"use strict";
/**
 * Scheduled cleanup: remove stale unverified Firebase Auth accounts (fake @g.msuiit.edu.ph, bots).
 *
 * Skips: verified users, SIGNUP_EMAIL_ALLOWLIST, Firestore role admin/counselor, custom claim admin.
 * Env: UNVERIFIED_AUTH_CLEANUP_GRACE_HOURS (default 72), UNVERIFIED_AUTH_CLEANUP_DISABLED=true to skip.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupUnverifiedAuthUsers = void 0;
exports.getCleanupSkipReason = getCleanupSkipReason;
exports.runUnverifiedAuthCleanup = runUnverifiedAuthCleanup;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const signupEmailPolicy_1 = require("./signupEmailPolicy");
const DEFAULT_GRACE_HOURS = 72;
const MIN_GRACE_HOURS = 24;
const MAX_GRACE_HOURS = 24 * 30;
function parseGraceHours() {
    const raw = process.env.UNVERIFIED_AUTH_CLEANUP_GRACE_HOURS?.trim();
    if (!raw)
        return DEFAULT_GRACE_HOURS;
    const n = Number(raw);
    if (!Number.isFinite(n))
        return DEFAULT_GRACE_HOURS;
    return Math.max(MIN_GRACE_HOURS, Math.min(MAX_GRACE_HOURS, Math.floor(n)));
}
function isCleanupDisabled() {
    return process.env.UNVERIFIED_AUTH_CLEANUP_DISABLED === 'true';
}
function authUserCreatedMs(user) {
    const created = user.metadata.creationTime;
    if (!created)
        return Date.now();
    const ms = new Date(created).getTime();
    return Number.isFinite(ms) ? ms : Date.now();
}
function normalizeRole(role) {
    if (typeof role !== 'string')
        return null;
    const r = role.trim().toLowerCase();
    return r || null;
}
function getCleanupSkipReason(user, firestoreRole, cutoffMs) {
    if (user.emailVerified)
        return 'verified';
    const email = (user.email ?? '').trim().toLowerCase();
    if (email && (0, signupEmailPolicy_1.isSignupEmailAllowlisted)(email))
        return 'allowlist';
    if (user.customClaims?.admin === true)
        return 'admin_claim';
    const role = firestoreRole ?? '';
    if (role === 'admin')
        return 'role_admin';
    if (role === 'counselor')
        return 'role_counselor';
    if (authUserCreatedMs(user) > cutoffMs)
        return 'too_recent';
    return null;
}
async function deleteAuthUserAndProfile(uid, db) {
    try {
        await db.collection('users').doc(uid).delete();
    }
    catch (err) {
        logger.warn('[cleanupUnverified] users doc delete failed', { uid, err });
    }
    try {
        await db.collection('userSettings').doc(uid).delete();
    }
    catch {
        /* profile settings may not exist */
    }
    await admin.auth().deleteUser(uid);
}
async function runUnverifiedAuthCleanup() {
    const graceHours = parseGraceHours();
    const cutoffMs = Date.now() - graceHours * 60 * 60 * 1000;
    const db = admin.firestore();
    const auth = admin.auth();
    const skipped = {};
    const bumpSkip = (reason) => {
        skipped[reason] = (skipped[reason] ?? 0) + 1;
    };
    let scanned = 0;
    let deleted = 0;
    let errors = 0;
    let pageToken;
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
            }
            catch (err) {
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
exports.cleanupUnverifiedAuthUsers = (0, scheduler_1.onSchedule)({
    schedule: 'every 24 hours',
    region: 'asia-southeast2',
    timeZone: 'Asia/Manila',
}, async () => {
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
});
//# sourceMappingURL=cleanupUnverifiedAuthUsers.js.map