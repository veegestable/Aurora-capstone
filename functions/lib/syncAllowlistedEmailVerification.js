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
exports.syncAllowlistedEmailVerificationTrusted = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const signupEmailPolicy_1 = require("./signupEmailPolicy");
/**
 * After sign-in, mark QA allowlisted emails verified in Auth + Firestore.
 * Uses server SIGNUP_EMAIL_ALLOWLIST so production web builds do not need VITE_* baked in.
 */
exports.syncAllowlistedEmailVerificationTrusted = (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    }
    const auth = admin.auth();
    const userRecord = await auth.getUser(uid);
    if (userRecord.emailVerified) {
        return { ok: true, synced: false };
    }
    const email = userRecord.email?.trim().toLowerCase() ?? '';
    if (!email || !(0, signupEmailPolicy_1.isSignupEmailAllowlisted)(email)) {
        return { ok: true, synced: false };
    }
    await auth.updateUser(uid, { emailVerified: true });
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();
    if (snap.exists) {
        await userRef.update({
            email_verified: true,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    return { ok: true, synced: true };
});
//# sourceMappingURL=syncAllowlistedEmailVerification.js.map