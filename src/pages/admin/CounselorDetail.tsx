import { useParams } from 'react-router-dom'
import { AdminPlaceholder } from '../../components/admin/AdminPlaceholder'

export default function AdminCounselorDetail() {
  const { id } = useParams<{ id: string }>()
  return <AdminPlaceholder title="Counselor Details" description={`Profile, approval management, and student assignments. (${id})`} />
}