import { listByStudent } from './get/listByStudent'
import { createNote } from './post/createNote'
import { updateNote } from './put/updateNote'
import { deleteNote } from './delete/deleteNote'

export * from './types'

export const counselorNotesService = {
  listByStudent,
  createNote,
  updateNote,
  deleteNote,
}