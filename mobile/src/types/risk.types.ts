export type RiskSeverity = 'low' | 'medium' | 'high';
export type RiskStatus = 'open' | 'in_progress' | 'resolved';

export interface RiskFlag {
    id: string;
    studentId: string;
    reason: string;
    severity: RiskSeverity;
    status: RiskStatus;
}
