export interface ReportSummary {
    generatedAt: string;
    program: string;
    yearLevel: number;
}

export const reportsService = {
    async generateAnonymized(): Promise<ReportSummary[]> {
        return [];
    },
};
