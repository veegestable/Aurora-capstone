"use strict";
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
exports.createCreateCounselorAccountTrusted = createCreateCounselorAccountTrusted;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const iitCollegePrograms_1 = require("./iitCollegePrograms");
const signupEmailPolicy_1 = require("./signupEmailPolicy");
const authHelpers_1 = require("./authHelpers");
function parseCreateCounselorInput(data) {
    const email = (0, authHelpers_1.normalizeEmail)(typeof data?.email === 'string' ? data.email : '');
    const password = typeof data?.password === 'string' ? data.password : '';
    const fullName = typeof data?.fullName === 'string' ? data.fullName.trim() : '';
    const college_code = typeof data?.college_code === 'string' ? data.college_code.trim() : '';
    const contact_number = typeof data?.contact_number === 'string'
        ? data.contact_number.trim()
        : undefined;
    if (!(0, authHelpers_1.isPlausibleEmail)(email)) {
        throw new https_1.HttpsError('invalid-argument', 'Enter a valid email address.');
    }
    if (password.length < 6) {
        throw new https_1.HttpsError('invalid-argument', 'Temporary password must be at least 6 characters.');
    }
    if (!fullName) {
        throw new https_1.HttpsError('invalid-argument', "Enter the counselor's full name.");
    }
    if (!(0, iitCollegePrograms_1.isCollegeCode)(college_code)) {
        throw new https_1.HttpsError('invalid-argument', 'Select a valid college.');
    }
    const policyError = (0, signupEmailPolicy_1.getSignupEmailRejectionMessage)(email);
    if (policyError) {
        throw new https_1.HttpsError('invalid-argument', policyError);
    }
    return {
        email,
        password,
        fullName,
        college_code,
        ...(contact_number ? { contact_number } : {}),
    };
}
/** Admin-only counselor provisioning (replaces public counselor self-signup). */
function createCreateCounselorAccountTrusted(getRoleForUid) {
    return (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
        }
        const callerRole = await getRoleForUid(callerUid);
        if (callerRole !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admins can create counselor accounts.');
        }
        const input = parseCreateCounselorInput((request.data ?? {}));
        const auth = admin.auth();
        const db = admin.firestore();
        try {
            await auth.getUserByEmail(input.email);
            throw new https_1.HttpsError('already-exists', 'An account with this email already exists.');
        }
        catch (err) {
            if (err instanceof https_1.HttpsError)
                throw err;
            const code = err && typeof err === 'object' && 'code' in err
                ? String(err.code)
                : '';
            if (code !== 'auth/user-not-found') {
                console.error('[createCounselorAccountTrusted] getUserByEmail', err);
                throw new https_1.HttpsError('internal', 'Could not create counselor account. Please try again.');
            }
        }
        let uid;
        try {
            const userRecord = await auth.createUser({
                email: input.email,
                password: input.password,
                displayName: input.fullName,
                emailVerified: true,
            });
            uid = userRecord.uid;
            const now = admin.firestore.FieldValue.serverTimestamp();
            const profile = {
                uid,
                email: input.email,
                full_name: input.fullName,
                role: 'counselor',
                email_verified: true,
                approval_status: 'approved',
                college_code: input.college_code,
                provisioned_by_admin: true,
                created_by_admin_uid: callerUid,
                created_at: now,
                updated_at: now,
            };
            if (input.contact_number) {
                profile.contact_number = input.contact_number;
            }
            await db.collection('users').doc(uid).set(profile);
            return { ok: true, uid };
        }
        catch (err) {
            if (uid) {
                try {
                    await db.collection('users').doc(uid).delete();
                }
                catch (cleanupErr) {
                    console.warn('[createCounselorAccountTrusted] cleanup users doc failed', cleanupErr);
                }
                try {
                    await auth.deleteUser(uid);
                }
                catch (cleanupErr) {
                    console.warn('[createCounselorAccountTrusted] cleanup deleteUser failed', cleanupErr);
                }
            }
            if (err instanceof https_1.HttpsError)
                throw err;
            const code = err && typeof err === 'object' && 'code' in err
                ? String(err.code)
                : '';
            if (code === 'auth/email-already-exists') {
                throw new https_1.HttpsError('already-exists', 'An account with this email already exists.');
            }
            if (code === 'auth/weak-password') {
                throw new https_1.HttpsError('invalid-argument', 'Temporary password must be at least 6 characters.');
            }
            console.error('[createCounselorAccountTrusted] createUser/profile', err);
            throw new https_1.HttpsError('internal', 'Could not create counselor account. Please try again.');
        }
    });
}
//# sourceMappingURL=createCounselorAccountTrusted.js.map