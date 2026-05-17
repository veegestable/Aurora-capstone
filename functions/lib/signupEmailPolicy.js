"use strict";
/** Server-side sign-up email policy (mirrors web/mobile env). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSignupEmailAllowlist = parseSignupEmailAllowlist;
exports.isSignupEmailAllowlisted = isSignupEmailAllowlisted;
exports.getSignupEmailRejectionMessage = getSignupEmailRejectionMessage;
const MSUIIT_SUFFIX = '@g.msuiit.edu.ph';
function stripQuotes(s) {
    const t = s.trim();
    if ((t.startsWith('"') && t.endsWith('"')) ||
        (t.startsWith("'") && t.endsWith("'"))) {
        return t.slice(1, -1).trim();
    }
    return t;
}
function parseSignupEmailAllowlist(raw) {
    if (!raw || typeof raw !== 'string')
        return [];
    const outer = stripQuotes(raw);
    return outer
        .split(/[,;\n]+/)
        .map((s) => stripQuotes(s).toLowerCase())
        .filter(Boolean);
}
function isSignupEmailAllowlisted(email) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed)
        return false;
    return parseSignupEmailAllowlist(process.env.SIGNUP_EMAIL_ALLOWLIST).includes(trimmed);
}
/** Ignored in production — only Functions emulator may disable MSU-IIT suffix check. */
function isEmulatorOpenSignupEmailEnabled() {
    return (process.env.FUNCTIONS_EMULATOR === 'true' &&
        process.env.REQUIRE_MSUIIT_SIGNUP_EMAIL === 'false');
}
function getSignupEmailRejectionMessage(email) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed)
        return 'Enter your email address.';
    if (!trimmed.includes('@'))
        return 'Enter a valid email address.';
    if (isEmulatorOpenSignupEmailEnabled())
        return null;
    if (isSignupEmailAllowlisted(trimmed))
        return null;
    if (!trimmed.endsWith(MSUIIT_SUFFIX)) {
        return `Use your MSU-IIT email (${MSUIIT_SUFFIX})`;
    }
    return null;
}
//# sourceMappingURL=signupEmailPolicy.js.map