import { collection, query, where, orderBy, getDocs, Timestamp } from '../db'
import { db } from '../db'

export const getSchedules = async (userId: string, startDate?: Date, endDate?: Date) => {
  try {
    let q = query(
      collection(db, 'schedules'),
      where('user_id', '==', userId),
      orderBy('event_date', 'asc')
    )

    if (startDate) {
      q = query(q, where('event_date', '>=', Timestamp.fromDate(startDate)))
    }
    if (endDate) {
      q = query(q, where('event_date', '<=', Timestamp.fromDate(endDate)))
    }

    const querySnapshot = await getDocs(q)
    const schedules = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      event_date: doc.data().event_date.toDate(),
      created_at: doc.data().created_at?.toDate()
    }))

    console.log('✅ Retrieved', schedules.length, 'schedules')
    return schedules
  } catch (error: any) {
    console.error('❌ Error getting schedules:', error)
    throw error
  }
}
