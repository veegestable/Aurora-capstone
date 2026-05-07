import { listResources } from './get/listResources'
import { createResource } from './post/createResource'
import { updateResource } from './put/updateResource'
import { deleteResource } from './delete/deleteResource'

export const resourcesService = {
  listResources,
  createResource,
  updateResource,
  deleteResource,
}