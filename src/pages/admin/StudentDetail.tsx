import { useParams } from 'react-router-dom'
import { AdminPlaceholder } from '../../components/admin/AdminPlaceholder'

export default function AdminStudentDetail() {
  const { id } = useParams<{ id: string }>()
  return <AdminPlaceholder title="Student Details" description={`Student profile, mood status, and history. (${id})`} />
}