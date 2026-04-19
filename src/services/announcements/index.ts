import { listForRole } from './get/listForRole'
import { subscribeForRole } from './get/subscribeForRole'
import { listAll } from './get/listAll'
import { subscribeAll } from './get/subscribeAll'
import { createAnnouncement } from './post/createAnnouncement'
import { uploadAnnouncementImage } from './post/uploadAnnouncementImage'
import { updateAnnouncement } from './put/updateAnnouncement'
import { deleteAnnouncement } from './delete/deleteAnnouncement'

export const announcementsService = {
  listForRole,
  subscribeForRole,
  listAll,
  subscribeAll,
  createAnnouncement,
  uploadAnnouncementImage,
  updateAnnouncement,
  deleteAnnouncement,
}