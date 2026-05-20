"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_SCHEDULING_TIMEZONE = void 0;
exports.parseSessionSlotToMillisManila = parseSessionSlotToMillisManila;
exports.parsePreferredTimeStringManila = parsePreferredTimeStringManila;
exports.isSessionStartInFutureManila = isSessionStartInFutureManila;
const luxon_1 = require("luxon");
exports.SESSION_SCHEDULING_TIMEZONE = 'Asia/Manila';
function norm(s) {
    return s
        .replace(/\u202f/g, ' ')
        .replace(/\u00a0/g, ' ')
        .replace(/\u2007/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function parse12Or24hm(timeStr) {
    const t = norm(timeStr);
    const m12 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?$/i);
    if (m12) {
        let hour = parseInt(m12[1], 10);
        const minute = parseInt(m12[2], 10);
        const ap = m12[4]?.toUpperCase();
        if (ap === 'PM' && hour < 12)
            hour += 12;
        if (ap === 'AM' && hour === 12)
            hour = 0;
        if (!ap && hour > 23)
            return null;
        return { hour, minute };
    }
    const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
    if (m24) {
        const hour = parseInt(m24[1], 10);
        const minute = parseInt(m24[2], 10);
        if (hour > 23 || minute > 59)
            return null;
        return { hour, minute };
    }
    return null;
}
function parseSessionSlotToMillisManila(slot) {
    const datePart = norm(String(slot.date ?? ''));
    const timePart = slot.time != null ? norm(String(slot.time)) : '';
    if (!datePart)
        return null;
    const zone = exports.SESSION_SCHEDULING_TIMEZONE;
    const iso = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
        const y = parseInt(iso[1], 10);
        const mo = parseInt(iso[2], 10);
        const d = parseInt(iso[3], 10);
        if (!timePart) {
            const dt = luxon_1.DateTime.fromObject({ year: y, month: mo, day: d, hour: 23, minute: 59, second: 59, millisecond: 999 }, { zone });
            return dt.isValid ? dt.toMillis() : null;
        }
        const hm = parse12Or24hm(timePart);
        if (!hm)
            return null;
        const dt = luxon_1.DateTime.fromObject({ year: y, month: mo, day: d, hour: hm.hour, minute: hm.minute, second: 0, millisecond: 0 }, { zone });
        return dt.isValid ? dt.toMillis() : null;
    }
    if (timePart) {
        const combined = `${datePart}, ${timePart}`;
        const splitTry = luxon_1.DateTime.fromFormat(combined, 'MMMM d, yyyy, h:mm a', {
            zone,
            locale: 'en',
        });
        if (splitTry.isValid)
            return splitTry.toMillis();
        const splitTry2 = luxon_1.DateTime.fromFormat(combined, 'MMMM d, yyyy, hh:mm a', {
            zone,
            locale: 'en',
        });
        if (splitTry2.isValid)
            return splitTry2.toMillis();
    }
    const dateOnly = luxon_1.DateTime.fromFormat(datePart, 'MMMM d, yyyy', { zone, locale: 'en' });
    if (dateOnly.isValid) {
        if (!timePart) {
            const end = dateOnly.set({
                hour: 23,
                minute: 59,
                second: 59,
                millisecond: 999,
            });
            return end.toMillis();
        }
        const hm = parse12Or24hm(timePart);
        if (!hm)
            return null;
        const full = dateOnly.set({
            hour: hm.hour,
            minute: hm.minute,
            second: 0,
            millisecond: 0,
        });
        return full.isValid ? full.toMillis() : null;
    }
    return null;
}
function parsePreferredTimeStringManila(preferredTime) {
    if (!preferredTime?.trim())
        return null;
    const cleaned = norm(preferredTime).replace(/\s+at\s+/i, ', ');
    const zone = exports.SESSION_SCHEDULING_TIMEZONE;
    const fmts = ['MMMM d, yyyy, h:mm a', 'MMMM d, yyyy, hh:mm a'];
    for (const f of fmts) {
        const dt = luxon_1.DateTime.fromFormat(cleaned, f, { zone, locale: 'en' });
        if (dt.isValid)
            return dt.toMillis();
    }
    return null;
}
function isSessionStartInFutureManila(instantMs, nowMs, slackMs = 60000) {
    return instantMs > nowMs - slackMs;
}
//# sourceMappingURL=sessionSlotAuthority.js.map