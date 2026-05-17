"use strict";
/**
 * IIT degree programs by college — keep in sync with
 * `src/constants/college-programs-iit.ts` and Firestore rules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IIT_COLLEGE_PROGRAMS = exports.COLLEGE_CODES = void 0;
exports.isCollegeCode = isCollegeCode;
exports.isProgramInCollege = isProgramInCollege;
exports.COLLEGE_CODES = [
    'COE',
    'CSM',
    'CCS',
    'CED',
    'CASS',
    'CEBA',
    'CHS',
];
const COLLEGE_CODE_SET = new Set(exports.COLLEGE_CODES);
exports.IIT_COLLEGE_PROGRAMS = {
    COE: [
        'Bachelor of Science in Chemical Engineering (BSChe)',
        'Bachelor of Science in Environmental Engineering',
        'Bachelor of Science in Civil Engineering (BSCE)',
        'Bachelor of Science in Computer Engineering (BSCpE)',
        'Bachelor of Science in Electrical Engineering (BSEE)',
        'Bachelor of Science in Electronics and Communication Engineering (BSECE)',
        'Bachelor of Science in Industrial Automation and Mechatronics',
        'Bachelor of Science in Ceramics Engineering',
        'Bachelor of Science in Metallurgical Engineering',
        'Bachelor of Science in Mining Engineering',
        'Bachelor of Science in Mechanical Engineering (BSME)',
        'Bachelor of Engineering Technology Major in Chemical Engineering and Technology',
        'Bachelor of Engineering Technology Major in Civil Engineering Technology (BET-CET)',
        'Bachelor of Engineering Technology Major in Electrical Engineering Technology (BET-EET)',
        'Bachelor of Engineering Technology Major in Electronics Engineering Technology (BET-EST)',
        'Bachelor of Engineering Technology Major in Metallurgical and Materials Engineering Technology (BET-MMT)',
        'Bachelor of Engineering Technology Major in Mechanical Engineering Technology (BET-MET)',
    ],
    CCS: [
        'Bachelor of Science in Information Technology (BSIT)',
        'Bachelor of Science in Computer Science (BSCS)',
        'Bachelor of Science in Information Systems (BSIS)',
        'Bachelor of Science in Computer Applications (BSCA)',
    ],
    CSM: [
        'Bachelor of Science in Biology (General)',
        'Bachelor of Science in Biology (Botany)',
        'Bachelor of Science in Biology (Marine Biology)',
        'Bachelor of Science in Biology (Zoology)',
        'Bachelor of Science in Chemistry',
        'Bachelor of Science in Mathematics',
        'Bachelor of Science in Statistics',
        'Bachelor of Science in Physics',
    ],
    CED: [
        'Bachelor of Elementary Education Science and Mathematics',
        'Bachelor of Secondary Education Biology',
        'Bachelor of Secondary Education Chemistry',
        'Bachelor of Secondary Education Physics',
        'Bachelor of Secondary Education Mathematics',
        'Bachelor of Physical Education',
        'Bachelor of Technology and Livelihood Education Major in Home Economics',
        'Bachelor of Technical-Vocational Teacher Education Major in Drafting Technology',
        'Bachelor of Technology and Livelihood Education Major in Industrial Arts (BTLEd-Industrial Arts)',
        'Bachelor of Elementary Education – Language Education',
        'Bachelor of Secondary Education Filipino',
    ],
    CASS: [
        'Bachelor of Arts in English Language Studies',
        'Bachelor of Arts in Filipino',
        'Bachelor of Arts in History',
        'Bachelor of Arts in Panitikan',
        'Bachelor of Arts in Political Science',
        'Bachelor of Arts in Psychology',
        'Bachelor of Arts in Sociology',
        'Bachelor of Science in Philosophy',
        'Bachelor of Science in Psychology',
    ],
    CEBA: [
        'Bachelor of Science in Accountancy',
        'Bachelor of Science in Economics',
        'Bachelor of Science in Business Administration Major in Business Economics',
        'Bachelor of Science in Business Administration Major in Marketing Management',
        'Bachelor of Science Major in Entrepreneurship',
        'Bachelor of Science in Hospitality Management',
    ],
    CHS: ['Bachelor of Science in Nursing'],
};
function isCollegeCode(code) {
    const c = code?.trim();
    return !!c && COLLEGE_CODE_SET.has(c);
}
function isProgramInCollege(collegeCode, program) {
    const p = program?.trim();
    if (!p || !isCollegeCode(collegeCode))
        return false;
    return exports.IIT_COLLEGE_PROGRAMS[collegeCode].includes(p);
}
//# sourceMappingURL=iitCollegePrograms.js.map