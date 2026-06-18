"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSendPasswordResetTrusted = createSendPasswordResetTrusted;
const https_1 = require("firebase-functions/v2/https");
const authHelpers_1 = require("./authHelpers");
const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;
const PASSWORD_RESET_EMAIL_MAX = 3;
const PASSWORD_RESET_IP_MAX = 5;
/** Rate-limited password reset email (no auth — proves nothing, limits abuse). */
function createSendPasswordResetTrusted(enforceRateLimit) {
    return (0, https_1.onCall)({ region: 'asia-southeast2' }, async (request) => {
        const data = (request.data ?? {});
        const email = (0, authHelpers_1.normalizeEmail)(typeof data.email === 'string' ? data.email : '');
        if (!(0, authHelpers_1.isPlausibleEmail)(email)) {
            throw new https_1.HttpsError('invalid-argument', 'Please enter a valid email address.');
        }
        if (!(0, authHelpers_1.getFirebaseWebApiKey)()) {
            throw new https_1.HttpsError('unavailable', 'Could not send reset email right now. Please try again later.');
        }
        const ip = (0, authHelpers_1.clientIpFromRequest)(request.rawRequest);
        await enforceRateLimit('password_reset_email', email, PASSWORD_RESET_WINDOW_MS, PASSWORD_RESET_EMAIL_MAX);
        await enforceRateLimit('password_reset_ip', ip, PASSWORD_RESET_WINDOW_MS, PASSWORD_RESET_IP_MAX);
        const sent = await (0, authHelpers_1.identityToolkitSendOobCode)('PASSWORD_RESET', { email });
        if (!sent) {
            // Do not reveal whether the account exists (same as Firebase client SDK).
            console.warn('[sendPasswordResetTrusted] sendOobCode failed', email);
        }
        return { ok: true };
    });
}
//# sourceMappingURL=sendPasswordResetTrusted.js.map