import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  Timestamp,
  limit,
  onSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  targetRole: 'all' | 'counselor' | 'student';
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  imageUrl?: string;
  targetRole: 'all' | 'counselor' | 'student';
  createdBy: string;
  createdByName: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  imageUrl?: string | null;
  targetRole?: 'all' | 'counselor' | 'student';
}

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'mock-1',
    title: 'Welcome to Aurora',
    content: 'Your mental wellness companion. Track your mood, connect with counselors, and explore resources tailored for you.',
    imageUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400',
    targetRole: 'all',
    createdBy: 'system',
    createdByName: 'Aurora Team',
    createdAt: new Date(),
  },
  {
    id: 'mock-2',
    title: 'Wellness Tip',
    content: 'Take a moment to breathe. Small check-ins can make a big difference in how you feel.',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400',
    targetRole: 'all',
    createdBy: 'system',
    createdByName: 'Aurora Team',
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: 'mock-3',
    title: 'Counselor Support Available',
    content: 'Remember that our counselors are here for you. Request a session anytime from the Messages screen.',
    imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400',
    targetRole: 'all',
    createdBy: 'system',
    createdByName: 'Aurora Team',
    createdAt: new Date(Date.now() - 172800000),
  },
];

const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

function mapAnnouncementsForRole(
  docs: QueryDocumentSnapshot[],
  role: 'counselor' | 'student',
  maxCount: number
): Announcement[] {
  const now = Date.now();
  const list = docs
    .map((d) => {
      const data = d.data();
      const target = (data.targetRole ?? 'all') as string;
      const allowed = target === 'all' || target === role;
      if (!allowed) return null;
      const createdAt = data.createdAt?.toDate?.() ?? new Date();
      if (now - createdAt.getTime() > THREE_WEEKS_MS) return null;
      return {
        id: d.id,
        title: data.title ?? '',
        content: data.content ?? '',
        imageUrl: data.imageUrl ?? undefined,
        targetRole: data.targetRole ?? 'all',
        createdBy: data.createdBy ?? '',
        createdByName: data.createdByName ?? '',
        createdAt,
      } as Announcement;
    })
    .filter(Boolean) as Announcement[];
  return list.slice(0, maxCount);
}

export const announcementsService = {
  async listForRole(role: 'counselor' | 'student', maxCount = 20): Promise<Announcement[]> {
    try {
      const q = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'),
        limit(maxCount)
      );
      const snapshot = await getDocs(q);
      const list = mapAnnouncementsForRole(snapshot.docs, role, maxCount);
      return list.length > 0 ? list : MOCK_ANNOUNCEMENTS;
    } catch {
      return MOCK_ANNOUNCEMENTS;
    }
  },

  subscribeForRole(
    role: 'counselor' | 'student',
    maxCount: number,
    onNext: (list: Announcement[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(maxCount)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list = mapAnnouncementsForRole(snapshot.docs, role, maxCount);
        onNext(list.length > 0 ? list : MOCK_ANNOUNCEMENTS);
      },
      (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
    );
  },

  async create(input: CreateAnnouncementInput): Promise<string> {
    const docRef = await addDoc(collection(db, 'announcements'), {
      title: input.title.trim(),
      content: input.content.trim(),
      imageUrl: input.imageUrl?.trim() || null,
      targetRole: input.targetRole,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async update(id: string, input: UpdateAnnouncementInput): Promise<void> {
    const ref = doc(db, 'announcements', id);
    const updates: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.content !== undefined) updates.content = input.content.trim();
    if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl?.trim() || null;
    if (input.targetRole !== undefined) updates.targetRole = input.targetRole;
    await updateDoc(ref, updates);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'announcements', id));
  },
};
