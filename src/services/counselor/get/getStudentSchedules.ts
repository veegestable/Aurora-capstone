import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase-firestore/db'
import { ScheduleResponse } from '../types'

export const getStudentSchedules = async (
  studentId: string, 
  startDate?: string, 
  endDate?: string
): Promise<ScheduleResponse[]> => {
  try {
    let q = query(
      collection(db, 'schedules'),
      where('user_id', '==', studentId)
    )

    if (startDate) q = query(q, where('event_date', '>=', Timestamp.fromDate(new Date(startDate))))
    if (endDate) q = query(q, where('event_date', '<=', Timestamp.fromDate(new Date(endDate))))

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        user_id: data.user_id,
        event_type: data.event_type,
        event_date: data.event_date?.toDate().toISOString() || new Date().toISOString(),
        description: data.description
      } as ScheduleResponse
    })
  } catch (error) {
    console.error('Error fetching student schedules: ', error)
    return []
  }
}