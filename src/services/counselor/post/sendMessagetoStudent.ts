export const sendMessagetoStudent = async (
  counselorId: string,
  studentId: string,
  message: string
) => {
  try {
    const response = await fetch('/api/counselor/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        counselor_id: counselorId,
        student_id: studentId,
        message
      })
    })

    if (!response.ok) throw new Error('Failed to send message')
    return await response.json()
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}