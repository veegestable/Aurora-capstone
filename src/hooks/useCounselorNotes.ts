import { useCallback, useEffect, useState } from 'react'
import { counselorNotesService, type CounselorNote } from '../services/counselor-notes'

export function useCounselorNotes(
  studentId?: string, 
  counselorId?: string
) {
  const [notes, setNotes] = useState<CounselorNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!studentId || !counselorId) {
      setNotes([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const rows = await counselorNotesService.listByStudent(studentId, counselorId)
      setNotes(rows)
    } catch (e) {
      console.error('Failed to load counselor notes:', e)
      setError('Failed to load counselor notes')
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [studentId, counselorId])

  useEffect(() => {
    void load()
  }, [load])

  const create = useCallback(
    async (note: string) => {
      if (!studentId || !counselorId) return
      await counselorNotesService.createNote({ counselorId, studentId, note })
      await load()
    },
    [studentId, counselorId, load]
  )

  const update = useCallback(
    async (noteId: string, note: string) => {
      await counselorNotesService.updateNote({ noteId, note })
      await load()  
    },
    [load]
  )

  const remove = useCallback(
    async (noteId: string) => {
      await counselorNotesService.deleteNote(noteId)
      await load()
    },
    [load]
  )

  return {
    notes,
    loading,
    error,
    reload: load,
    create,
    update,
    remove,
  }
}