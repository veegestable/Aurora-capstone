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
exports.createSignUpTrusted = createSignUpTrusted;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const authHelpers_1 = require("./authHelpers");
const iitCollegePrograms_1 = require("./iitCollegePrograms");
const signupEmailPolicy_1 = require("./signupEmailPolicy");
const SIGNUP_IP_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_IP_MAX = 5;
/** Failed or successful registration attempts per email per hour. */
const SIGNUP_EMAIL_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_EMAIL_ATTEMPT_MAX = 3;
function parseSignUpInput(data) {
    const email = (0, authHelpers_1.normalizeEmail)(typeof data?.email === 'string' ? data.email : '');
    const password = typeof data?.password === 'string' ? data.password : '';
    const fullName = typeof data?.fullName === 'string' ? data.fullName.trim() : '';
    const role = data?.role === 'student' || data?.role === 'counselor' ? data.role : null;
    const college_code = typeof data?.college_code === 'string' ? data.college_code.trim() : '';
    const program = typeof data?.program === 'string' ? data.program.trim() : undefined;
    const contact_number = typeof data?.contact_number === 'string'
        ? data.contact_number.trim()
        : undefined;
    if (!(0, authHelpers_1.isPlausibleEmail)(email)) {
        throw new https_1.HttpsError('invalid-argument', 'Enter a valid email address.');
    }
    if (password.length < 6) {
        throw new https_1.HttpsError('invalid-argument', 'Choose a stronger password (at least 6 characters).');
    }
    if (!fullName) {
        throw new https_1.HttpsError('invalid-argument', 'Enter your full name.');
    }
    if (!role) {
        throw new https_1.HttpsError('invalid-argument', 'Select student or counselor.');
    }
    if (!(0, iitCollegePrograms_1.isCollegeCode)(college_code)) {
        throw new https_1.HttpsError('invalid-argument', 'Select a valid college before signing up.');
    }
    if (role === 'student') {
        if (!program || !(0, iitCollegePrograms_1.isProgramInCollege)(college_code, program)) {
            throw new https_1.HttpsError('invalid-argument', 'Select a degree program that matches your college before signing up.');
        }
    }
    const policyError = (0, signupEmailPolicy_1.getSignupEmailRejectionMessage)(email);
    if (policyError) {
        throw new https_1.HttpsError('invalid-argument', policyError);
    }
    return {
        email,
        password,
        fullName,
        role,
        college_code,
        ...(role === 'student' && program ? { program } : {}),
        ...(contact_number ? { contact_number } : {}),
    };
}
/** Rate-limited registration via Admin SDK (web + mobile). */
function createSignUpTrusted(enforceRateLimit) {
    return (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
        const input = parseSignUpInput((request.data ?? {}));
        const ip = (0, authHelpers_1.clientIpFromRequest)(request.rawRequest);
        await enforceRateLimit('signup_ip', ip, SIGNUP_IP_WINDOW_MS, SIGNUP_IP_MAX);
        await enforceRateLimit('signup_email_attempt', input.email, SIGNUP_EMAIL_ATTEMPT_WINDOW_MS, SIGNUP_EMAIL_ATTEMPT_MAX);
        const auth = admin.auth();
        try {
            await auth.getUserByEmail(input.email);
            throw new https_1.HttpsError('already-exists', 'An account with this email already exists. Try signing in instead.');
        }
        catch (err) {
            const code = err && typeof err === 'object' && 'code' in err
                ? String(err.code)
                : '';
            if (code !== 'auth/user-not-found') {
                if (err instanceof https_1.HttpsError)
                    throw err;
                console.error('[signUpTrusted] getUserByEmail', err);
                throw new https_1.HttpsError('internal', 'Could not complete registration. Please try again.');
            }
        }
        let uid;
        const db = admin.firestore();
        try {
            const userRecord = await auth.createUser({
                email: input.email,
                password: input.password,
                displayName: input.fullName,
                emailVerified: false,
            });
            uid = userRecord.uid;
            const now = admin.firestore.FieldValue.serverTimestamp();
            const profile = {
                uid,
                email: input.email,
                full_name: input.fullName,
                role: input.role,
                email_verified: false,
                college_code: input.college_code,
                created_at: now,
                updated_at: now,
            };
            if (input.role === 'counselor') {
                profile.approval_status = 'pending';
            }
            if (input.role === 'student' && input.program) {
                profile.program = input.program;
            }
            if (input.contact_number) {
                profile.contact_number = input.contact_number;
            }
            await db.collection('users').doc(uid).set(profile);
            const sent = await (0, authHelpers_1.identityToolkitSendOobCode)('VERIFY_EMAIL', {
                email: input.email,
            });
            if (!sent) {
                throw new https_1.HttpsError('unavailable', 'Use a valid email address to sign up.');
            }
            return { ok: true, uid };
        }
        catch (err) {
            if (uid) {
                try {
                    await db.collection('users').doc(uid).delete();
                }
                catch (cleanupErr) {
                    console.warn('[signUpTrusted] cleanup users doc failed', cleanupErr);
                }
                try {
                    await auth.deleteUser(uid);
                }
                catch (cleanupErr) {
                    console.warn('[signUpTrusted] cleanup deleteUser failed', cleanupErr);
                }
            }
            if (err instanceof https_1.HttpsError)
                throw err;
            const code = err && typeof err === 'object' && 'code' in err
                ? String(err.code)
                : '';
            if (code === 'auth/email-already-exists') {
                throw new https_1.HttpsError('already-exists', 'An account with this email already exists. Try signing in instead.');
            }
            if (code === 'auth/weak-password') {
                throw new https_1.HttpsError('invalid-argument', 'Choose a stronger password (at least 6 characters).');
            }
            console.error('[signUpTrusted] createUser/profile', err);
            throw new https_1.HttpsError('internal', 'Could not complete registration. Please try again.');
        }
    });
}
//# sourceMappingURL=signUpTrusted.js.map