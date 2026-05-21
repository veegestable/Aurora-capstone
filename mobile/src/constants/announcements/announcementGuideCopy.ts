import type { InfoGuideContent } from "../../components/common/InfoGuideModal";

export const ANNOUNCEMENT_GUIDE_COUNSELOR: InfoGuideContent = {
  title: "How announcements work",
  body:
    "When you publish, you choose who should see the post — for example students at your college, counselors, or a specific audience you set in the form.\n\n" +
    "Your dashboard carousel only shows announcements from the last 3 weeks (21 days). Older posts stop appearing there for you and for students, but they are not automatically removed from Aurora.\n\n" +
    "You can delete any announcement you published. Deleting takes it away immediately for everyone who would have seen it.\n\n" +
    "Aurora does not auto-delete old announcements after 3 weeks. That time limit is only about what appears in feeds — unless you delete a post yourself, it stays stored in the system.",
};

export const ANNOUNCEMENT_GUIDE_ADMIN: InfoGuideContent = {
  title: "How announcements work",
  body:
    "When you publish, you choose the audience — students, counselors, specific colleges, or combined groups.\n\n" +
    "Student and counselor feeds only show announcements from the last 3 weeks (21 days). Older posts stop appearing in those carousels and dashboards. They are not automatically deleted from Aurora's database.\n\n" +
    "On this announcements page, every post stays listed regardless of age so you can review, edit, or remove old ones.\n\n" +
    "You can delete any announcement at any time. Deleting removes it immediately for all viewers.\n\n" +
    "There is no scheduled auto-delete job: hiding after 3 weeks is a display rule only, not permanent erasure unless someone deletes it manually.",
};

export function announcementGuideForRole(
  role: "counselor" | "admin",
): InfoGuideContent {
  return role === "admin"
    ? ANNOUNCEMENT_GUIDE_ADMIN
    : ANNOUNCEMENT_GUIDE_COUNSELOR;
}
