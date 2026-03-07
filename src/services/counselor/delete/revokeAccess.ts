export const revokeAccess = async (accessId: string) => {
  try {
    const response = await fetch(`/api/counselor/access/${accessId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (!response.ok) throw new Error('Failed to revoke access')
    return await response.json()
  } catch (error) {
    console.error('Error revoking access: ', error)
  }
}