export type ResourceStatus = 'published' | 'draft'

export interface ResourceRecord {
  id: string
  title: string
  category: string
  duration: string
  type: string
  image: string
  status: ResourceStatus
  description?: string
  updatedAt?: Date | string
}