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
exports.resolveConversationCollegeCode = resolveConversationCollegeCode;
exports.ensureConversationDocument = ensureConversationDocument;
const admin = __importStar(require("firebase-admin"));
const COLLEGE_CODES = new Set([
    'COE',
    'CSM',
    'CCS',
    'CED',
    'CASS',
    'CEBA',
    'CHS',
]);
function resolveCollegeFromUserData(data) {
    if (!data)
        return '';
    const cc = data.college_code;
    if (typeof cc === 'string' && COLLEGE_CODES.has(cc))
        return cc;
    const dept = data.department;
    if (typeof dept === 'string' && COLLEGE_CODES.has(dept))
        return dept;
    return '';
}
async function resolveConversationCollegeCode(db, counselorId, studentId) {
    const [cSnap, sSnap] = await Promise.all([
        db.collection('users').doc(counselorId).get(),
        db.collection('users').doc(studentId).get(),
    ]);
    const studentCollege = resolveCollegeFromUserData(sSnap.data());
    if (studentCollege)
        return studentCollege;
    return resolveCollegeFromUserData(cSnap.data());
}
/** Admin upsert for `conversations/{counselorId}_{studentId}` (bypasses client rules). */
async function ensureConversationDocument(input) {
    const db = admin.firestore();
    const conversationId = `${input.counselorId}_${input.studentId}`;
    const convRef = db.collection('conversations').doc(conversationId);
    const snap = await convRef.get();
    const collegeCode = await resolveConversationCollegeCode(db, input.counselorId, input.studentId);
    const profileFields = {
        counselorId: input.counselorId,
        studentId: input.studentId,
        student_name: input.studentName?.trim() || 'Student',
        student_avatar: input.studentAvatar?.trim() || '',
        counselor_name: input.counselorName?.trim() || 'Counselor',
        counselor_avatar: input.counselorAvatar?.trim() || '',
        ...(collegeCode ? { college_code: collegeCode } : {}),
    };
    if (!snap.exists) {
        await convRef.set({
            ...profileFields,
            lastMessage: '',
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSenderId: null,
            unreadCountCounselor: 0,
            unreadCountStudent: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    else {
        await convRef.set(profileFields, { merge: true });
    }
    return conversationId;
}
//# sourceMappingURL=ensureConversationAdmin.js.map