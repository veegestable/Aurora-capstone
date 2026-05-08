export type ResourceType = 'Meditation' | 'Focus' | 'Sleep' | 'Article'
export type ResourceStatus = 'published' | 'draft'

export interface ResourceDoc {
  title: string
  category: string
  duration: string
  type: ResourceType
  image: string
  status?: ResourceStatus
  createdAt?: { toDate?: () => Date }
  updatedAt?: { toDate?: () => Date }
}

export interface ResourceItem {
  id: string
  title: string
  category: string
  duration: string
  type: ResourceType
  image: string
  status: ResourceStatus
  createdAt?: Date
  updatedAt?: Date
}