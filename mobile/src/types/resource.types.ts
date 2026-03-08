export interface Resource {
    id: string;
    title: string;
    content: string;
    type: 'article' | 'exercise' | 'video' | 'tip';
    moodTag: string;
}
