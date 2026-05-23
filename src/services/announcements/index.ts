import { listForRole } from './get/listForRole'
import { subscribeForRole } from './get/subscribeForRole'
import { listAll } from './get/listAll'
import { subscribeAll } from './get/subscribeAll'
import { countAll } from './get/countAll'
import { createAnnouncement } from './post/createAnnouncement'
import { uploadAnnouncementImage } from './post/uploadAnnouncementImage'
import { updateAnnouncement } from './put/updateAnnouncement'
import { deleteAnnouncement } from './delete/deleteAnnouncement'

export const announcementsService = {
  listForRole,
  subscribeForRole,
  listAll,
  subscribeAll,
  countAll,
  createAnnouncement,
  uploadAnnouncementImage,
  updateAnnouncement,
  deleteAnnouncement,
}