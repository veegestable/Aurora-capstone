export type RiskSeverity = 'low' | 'medium' | 'high';

export interface RiskFlag {
    id: string;
    studentId: string;
    severity: RiskSeverity;
    status: 'open' | 'in_progress' | 'resolved';
}

export const riskFlagsService = {
    async listOpen(): Promise<RiskFlag[]> {
        return [];
    },
};
