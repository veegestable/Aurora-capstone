import type { FeedbackTone, InfoGuideContent } from "../components/common/InfoGuideModal";

export function inferFeedbackTone(title: string): FeedbackTone {
  const t = title.toLowerCase();
  if (
    /error|could not|failed|missing|not allowed|cannot|invalid|unavailable|required|disabled|reject|delete|expired/.test(
      t,
    )
  ) {
    return "error";
  }
  if (
    /success|saved|copied|cleared|nice work|well done|submitted|test sent|updated|complete/.test(
      t,
    )
  ) {
    return "success";
  }
  if (/permission|sign in|sign out|confirm|warning|notice/.test(t)) {
    return "warning";
  }
  return "info";
}

export function buildFeedback(
  title: string,
  body: string,
  tone?: FeedbackTone,
): InfoGuideContent {
  return {
    title,
    body,
    tone: tone ?? inferFeedbackTone(title),
  };
}
