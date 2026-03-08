export interface ResourceItem {
    id: string;
    title: string;
    type: 'article' | 'exercise' | 'video' | 'tip';
}

export const resourcesService = {
    async listPublished(): Promise<ResourceItem[]> {
        return [];
    },
};
