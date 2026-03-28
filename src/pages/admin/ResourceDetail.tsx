import { useParams } from 'react-router-dom'
import { AdminPlaceholder } from '../../components/admin/AdminPlaceholder'

export default function AdminResourceDetail() {
  const { id } = useParams<{ id: string }>()
  return <AdminPlaceholder title="Resource Details" description={`Review and publish resource content. (${id})`} />
}