import { COUNSELOR_VISIBLE_CHECKIN_SUMMARY } from './counselor/counselor-checkin-policy'

/** Short banner shown on student screens; tap opens the full privacy modal. */
export const STUDENT_PRIVACY_BANNER_TEXT =
  'Your wellness data is private. Tap to learn what counselors can see.'

export const STUDENT_MESSAGES_PRIVACY_FOOTER =
  'Messages are encrypted and shared only with your counselor.'

export const STUDENT_PRIVACY_MODAL_TITLE = 'Privacy & data'

export const STUDENT_PRIVACY_MODAL_INTRO =
  'Aurora is built for MSU-IIT student wellness support. Here is how your check-in data is shared with guidance counselors.'

export const STUDENT_PRIVACY_VISIBLE_TITLE = 'What counselors can see'
export const STUDENT_PRIVACY_VISIBLE_DETAIL = `${COUNSELOR_VISIBLE_CHECKIN_SUMMARY} Stress/energy trend tiles unlock for a counselor only when you are in their special population (you requested a session with them, or you accepted a session time they proposed). That is self-report data, not a diagnosis.`

export const STUDENT_PRIVACY_NARROW_TITLE =
  'What stays narrower until special population'
export const STUDENT_PRIVACY_NARROW_DETAIL =
  'Notes, sleep, meals, bath, and photos stay off counselor views until you enter that counselor’s special population (session request or accepting their proposed time). After consent, they can see the same journal detail you see in Aurora for support. There is no in-app switch to revoke that yet.'

export const STUDENT_PRIVACY_MESSAGES_DETAIL =
  'Counselor chat in Aurora is for scheduling and support. Message content is stored securely and is not shown to other students.'

/**
 * Official MSU-IIT site — update if your institution publishes a dedicated privacy URL.
 */
export const MSUIIT_PRIVACY_POLICY_URL = 'https://www.msuiit.edu.ph/'
