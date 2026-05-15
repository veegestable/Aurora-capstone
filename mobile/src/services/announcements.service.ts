import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  getCountFromServer,
  Timestamp,
  limit,
  onSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { isCollegeCode, type CollegeCode } from "../constants/colleges";

/** Who may create announcements (stored on each document). */
export type AnnouncementPublisherRole = "admin" | "counselor";

/**
 * Who can see the announcement (new model).
 * Legacy docs only have `targetRole` and no `visibility`.
 */
export type AnnouncementVisibility =
  | "students_all"
  | "counselors_all"
  | "colleges_cross"
  | "students_one_college";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  /** @deprecated Legacy; prefer `visibility`. Kept for older Firestore rows. */
  targetRole: "all" | "counselor" | "student";
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  publisherRole?: AnnouncementPublisherRole;
  visibility?: AnnouncementVisibility;
  /** When `visibility` is `colleges_cross` or `students_one_college`, audience college(s). */
  collegeCodes?: CollegeCode[];
  /** Short label for admin lists, e.g. "Students · all colleges". */
  audienceLabel?: string;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  imageUrl?: string;
  publisherRole: AnnouncementPublisherRole;
  visibility: AnnouncementVisibility;
  /** Required for `colleges_cross` and `students_one_college`; omit or empty for global audiences. */
  collegeCodes?: CollegeCode[];
  createdBy: string;
  createdByName: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  imageUrl?: string | null;
  publisherRole?: AnnouncementPublisherRole;
  visibility?: AnnouncementVisibility;
  collegeCodes?: CollegeCode[];
  /** @deprecated Synced from visibility for legacy consumers. */
  targetRole?: "all" | "counselor" | "student";
}

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "mock-1",
    title: "Welcome to Aurora",
    content:
      "Your mental wellness companion. Track your mood, connect with counselors, and explore resources tailored for you.",
    imageUrl:
      "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400",
    targetRole: "all",
    createdBy: "system",
    createdByName: "Aurora Team",
    createdAt: new Date(),
    visibility: "students_all",
    publisherRole: "admin",
    audienceLabel: "Students · all colleges",
  },
  {
    id: "mock-2",
    title: "Wellness Tip",
    content:
      "Take a moment to breathe. Small check-ins can make a big difference in how you feel.",
    imageUrl:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400",
    targetRole: "all",
    createdBy: "system",
    createdByName: "Aurora Team",
    createdAt: new Date(Date.now() - 86400000),
    visibility: "students_all",
    publisherRole: "admin",
    audienceLabel: "Students · all colleges",
  },
  {
    id: "mock-3",
    title: "Counselor Support Available",
    content:
      "Remember that our counselors are here for you. Request a session anytime from the Messages screen.",
    imageUrl:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400",
    targetRole: "all",
    createdBy: "system",
    createdByName: "Aurora Team",
    createdAt: new Date(Date.now() - 172800000),
    visibility: "students_all",
    publisherRole: "admin",
    audienceLabel: "Students · all colleges",
  },
];

const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

function normalizeCollegeCodes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c): c is string => typeof c === "string" && isCollegeCode(c));
}

function inferLegacyVisibility(
  targetRole: string | undefined,
): AnnouncementVisibility | undefined {
  const tr = targetRole ?? "all";
  if (tr === "student") return "students_all";
  if (tr === "counselor") return "counselors_all";
  if (tr === "all") return undefined;
  return undefined;
}

/** Human-readable audience for admin UI. */
export function formatAnnouncementAudienceLabel(a: Announcement): string {
  if (a.audienceLabel) return a.audienceLabel;
  const vis = a.visibility ?? inferLegacyVisibility(a.targetRole);
  const codes = a.collegeCodes?.length ? a.collegeCodes.join(", ") : "";
  if (!vis) return "Everyone (legacy)";
  switch (vis) {
    case "students_all":
      return "Students · all colleges";
    case "counselors_all":
      return "Counselors · all colleges";
    case "colleges_cross":
      return codes ? `Students & counselors · ${codes}` : "Selected colleges";
    case "students_one_college":
      return codes
        ? `Students & counselors · ${codes}`
        : "Students · one college";
    default:
      return "Custom";
  }
}

export type AnnouncementReaderRole = "counselor" | "student" | "admin";

export type AnnouncementReaderOptions = {
  viewerUserId?: string;
};

/**
 * Whether this announcement should appear for the viewer (aligned with Firestore read rules).
 */
export function announcementMatchesReader(
  viewerRole: AnnouncementReaderRole,
  viewerCollegeCode: string | undefined,
  data: Record<string, unknown>,
  options?: AnnouncementReaderOptions,
): boolean {
  const college = (viewerCollegeCode ?? "").trim();
  const viewerUserId = (options?.viewerUserId ?? "").trim();
  const createdBy =
    typeof data.createdBy === "string" ? data.createdBy.trim() : "";

  if (viewerRole === "admin") return true;
  if (viewerUserId && createdBy && viewerUserId === createdBy) return true;

  const visRaw = data.visibility as string | undefined;
  const codes = normalizeCollegeCodes(data.collegeCodes);

  if (!visRaw) {
    const tr = (data.targetRole ?? "all") as string;
    if (tr === "all") return true;
    if (tr === "student") return viewerRole === "student";
    if (tr === "counselor") return viewerRole === "counselor";
    return false;
  }

  const vis = visRaw as AnnouncementVisibility;
  switch (vis) {
    case "students_all":
      return viewerRole === "student";
    case "counselors_all":
      return viewerRole === "counselor";
    case "colleges_cross":
      if (!college || codes.length === 0) return false;
      return codes.includes(college);
    case "students_one_college":
      if (!college || codes.length === 0) return false;
      if (!codes.includes(college)) return false;
      return viewerRole === "student" || viewerRole === "counselor";
    default:
      return false;
  }
}

function mapAnnouncementsForRole(
  docs: QueryDocumentSnapshot[],
  role: AnnouncementReaderRole,
  viewerCollegeCode: string | undefined,
  maxCount: number,
  skipAudienceFilter = false,
  viewerUserId?: string,
): Announcement[] {
  const now = Date.now();
  const list = docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      if (
        !skipAudienceFilter &&
        !announcementMatchesReader(role, viewerCollegeCode, data, {
          viewerUserId,
        })
      ) {
        return null;
      }
      const createdAt =
        (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ??
        new Date();
      if (now - createdAt.getTime() > THREE_WEEKS_MS) return null;
      const collegeCodes = normalizeCollegeCodes(data.collegeCodes) as CollegeCode[];
      const vis =
        (data.visibility as AnnouncementVisibility | undefined) ??
        inferLegacyVisibility(data.targetRole as string | undefined);
      const ann: Announcement = {
        id: d.id,
        title: String(data.title ?? ""),
        content: String(data.content ?? ""),
        imageUrl:
          typeof data.imageUrl === "string" ? data.imageUrl : undefined,
        targetRole: (String(data.targetRole ?? "all")) as Announcement["targetRole"],
        createdBy: String(data.createdBy ?? ""),
        createdByName: String(data.createdByName ?? ""),
        createdAt,
        publisherRole: data.publisherRole as AnnouncementPublisherRole | undefined,
        visibility: vis,
        collegeCodes: collegeCodes.length ? collegeCodes : undefined,
      };
      ann.audienceLabel = formatAnnouncementAudienceLabel(ann);
      return ann;
    })
    .filter(Boolean) as Announcement[];
  return list.slice(0, maxCount);
}

function targetRoleFromVisibility(vis: AnnouncementVisibility): Announcement["targetRole"] {
  if (vis === "counselors_all") return "counselor";
  if (vis === "students_all" || vis === "students_one_college") return "student";
  return "all";
}

export const announcementsService = {
  /** Total documents in `announcements` (for admin dashboard stats). */
  async countAll(): Promise<number | null> {
    try {
      const snap = await getCountFromServer(collection(db, "announcements"));
      return snap.data().count;
    } catch {
      return null;
    }
  },

  async listForRole(
    role: AnnouncementReaderRole,
    viewerCollegeCode: string | undefined,
    maxCount = 20,
    skipAudienceFilter = false,
    viewerUserId?: string,
  ): Promise<Announcement[]> {
    try {
      const q = query(
        collection(db, "announcements"),
        orderBy("createdAt", "desc"),
        limit(maxCount),
      );
      const snapshot = await getDocs(q);
      const list = mapAnnouncementsForRole(
        snapshot.docs,
        role,
        viewerCollegeCode,
        maxCount,
        skipAudienceFilter,
        viewerUserId,
      );
      return list.length > 0 ? list : MOCK_ANNOUNCEMENTS;
    } catch {
      return MOCK_ANNOUNCEMENTS;
    }
  },

  subscribeForRole(
    role: AnnouncementReaderRole,
    viewerCollegeCode: string | undefined,
    maxCount: number,
    onNext: (list: Announcement[]) => void,
    onError?: (error: Error) => void,
    skipAudienceFilter = false,
    viewerUserId?: string,
  ): () => void {
    const q = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc"),
      limit(maxCount),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list = mapAnnouncementsForRole(
          snapshot.docs,
          role,
          viewerCollegeCode,
          maxCount,
          skipAudienceFilter,
          viewerUserId,
        );
        onNext(list.length > 0 ? list : MOCK_ANNOUNCEMENTS);
      },
      (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
    );
  },

  async listAll(maxCount = 100): Promise<Announcement[]> {
    try {
      const q = query(
        collection(db, "announcements"),
        orderBy("createdAt", "desc"),
        limit(maxCount),
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const collegeCodes = normalizeCollegeCodes(data.collegeCodes) as CollegeCode[];
        const vis =
          (data.visibility as AnnouncementVisibility | undefined) ??
          inferLegacyVisibility(data.targetRole as string | undefined);
        const ann: Announcement = {
          id: d.id,
          title: String(data.title ?? ""),
          content: String(data.content ?? ""),
          imageUrl:
            typeof data.imageUrl === "string" ? data.imageUrl : undefined,
          targetRole: (String(data.targetRole ?? "all")) as Announcement["targetRole"],
          createdBy: String(data.createdBy ?? ""),
          createdByName: String(data.createdByName ?? "Unknown"),
          createdAt:
            (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ??
            new Date(),
          publisherRole: data.publisherRole as AnnouncementPublisherRole | undefined,
          visibility: vis,
          collegeCodes: collegeCodes.length ? collegeCodes : undefined,
        };
        ann.audienceLabel = formatAnnouncementAudienceLabel(ann);
        return ann;
      });
      return list.length > 0 ? list : MOCK_ANNOUNCEMENTS;
    } catch {
      return MOCK_ANNOUNCEMENTS;
    }
  },

  async create(input: CreateAnnouncementInput): Promise<string> {
    const codes = (input.collegeCodes ?? []).filter((c) => isCollegeCode(c));
    const targetRole = targetRoleFromVisibility(input.visibility);
    const docRef = await addDoc(collection(db, "announcements"), {
      title: input.title.trim(),
      content: input.content.trim(),
      imageUrl: input.imageUrl?.trim() || null,
      publisherRole: input.publisherRole,
      visibility: input.visibility,
      collegeCodes: codes.length > 0 ? codes : [],
      targetRole,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, input: UpdateAnnouncementInput): Promise<void> {
    const ref = doc(db, "announcements", id);
    const updates: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.content !== undefined) updates.content = input.content.trim();
    if (input.imageUrl !== undefined)
      updates.imageUrl = input.imageUrl?.trim() || null;
    if (input.publisherRole !== undefined) updates.publisherRole = input.publisherRole;
    if (input.visibility !== undefined) {
      updates.visibility = input.visibility;
      updates.targetRole = targetRoleFromVisibility(input.visibility);
    }
    if (input.collegeCodes !== undefined) {
      const codes = input.collegeCodes.filter((c) => isCollegeCode(c));
      updates.collegeCodes = codes;
    }
    if (input.targetRole !== undefined) updates.targetRole = input.targetRole;
    await updateDoc(ref, updates);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, "announcements", id));
  },
};
