import { getResourceById } from './get/getResourceById'
import { updateResource } from './put/updateResource'

export * from './types'

export const resourcesService = {
  getResourceById,
  updateResource,
}