"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResendRegistrationVerificationTrusted = createResendRegistrationVerificationTrusted;
const https_1 = require("firebase-functions/v2/https");
const authHelpers_1 = require("./authHelpers");
const VERIFY_EMAIL_WINDOW_MS = 60 * 60 * 1000;
const VERIFY_EMAIL_MAX = 3;
const VERIFY_IP_MAX = 10;
/** Rate-limited resend of registration verification email (proves email+password server-side). */
function createResendRegistrationVerificationTrusted(enforceRateLimit) {
    return (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
        const data = (request.data ?? {});
        const email = (0, authHelpers_1.normalizeEmail)(typeof data.email === 'string' ? data.email : '');
        const password = typeof data.password === 'string' ? data.password : '';
        if (!(0, authHelpers_1.isPlausibleEmail)(email) || password.length < 6) {
            throw new https_1.HttpsError('invalid-argument', 'Enter the same email and password you used when signing up.');
        }
        const ip = (0, authHelpers_1.clientIpFromRequest)(request.rawRequest);
        await enforceRateLimit('verify_email', email, VERIFY_EMAIL_WINDOW_MS, VERIFY_EMAIL_MAX);
        await enforceRateLimit('verify_ip', ip, VERIFY_EMAIL_WINDOW_MS, VERIFY_IP_MAX);
        const idToken = await (0, authHelpers_1.identityToolkitSignIn)(email, password);
        if (!idToken) {
            throw new https_1.HttpsError('permission-denied', 'The email or password you entered is incorrect. Please try again.');
        }
        const sent = await (0, authHelpers_1.identityToolkitSendOobCode)('VERIFY_EMAIL', { idToken });
        if (!sent) {
            throw new https_1.HttpsError('unavailable', 'Could not send verification email right now. Please try again later.');
        }
        return { ok: true };
    });
}
//# sourceMappingURL=resendVerification.js.map