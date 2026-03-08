export const grantAccess = async (
  counselorId: string,
  studentId: string
) => {
  try {
    const response = await fetch('/api/counselor/access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        counselor_id: counselorId,
        student_id: studentId
      })
    })

    if (!response.ok) throw new Error('Failed to grant access')
    return await response.json()
  } catch (error) {
    console.error('Error granting access: ', error)
    throw error
  }
}