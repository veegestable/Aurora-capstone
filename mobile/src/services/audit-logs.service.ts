import {
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { AuditEntry } from '../types/audit.types';

export const auditLogsService = {
    async write(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<void> {
        await addDoc(collection(db, 'audit_logs'), {
            ...entry,
            createdAt: Timestamp.now(),
        });
    },

    async list(maxCount = 50): Promise<AuditEntry[]> {
        const q = query(
            collection(db, 'audit_logs'),
            orderBy('createdAt', 'desc'),
            limit(maxCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => {
            const data = d.data() as any;
            return {
                id: d.id,
                performedBy: String(data.performedBy ?? ''),
                performedByRole: data.performedByRole ? String(data.performedByRole) : undefined,
                action: String(data.action ?? ''),
                targetType: String(data.targetType ?? ''),
                targetId: String(data.targetId ?? ''),
                metadata: data.metadata ?? undefined,
                createdAt: data.createdAt?.toDate?.() ?? undefined,
            } satisfies AuditEntry;
        });
    },
};
