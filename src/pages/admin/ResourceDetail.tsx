import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { resourcesService, type ResourceStatus } from '../../services/resources'

const EMPTY_FORM = {
  title: '',
  category: '',
  duration: '',
  type: '',
  image: '',
  status: 'draft' as ResourceStatus,
  description: '',
}

export default function AdminResourceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    let cancelled = false

    async function loadResource() {
      if (!id) return
      setLoading(true)
      try {
        const row = await resourcesService.getResourceById(id)
        if (cancelled) return
        if (!row) {
          setNotFound(true)
          return
        }

        setForm({
          title: row.title ?? '',
          category: row.category ?? '',
          duration: row.duration ?? '',
          type: row.type ?? '',
          image: row.image ?? '',
          status: row.status ?? 'draft',
          description: row.description ?? '',
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadResource()
    return () => {
      cancelled = true
    }
  }, [id])

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      await resourcesService.updateResource(id, form)
      navigate('/admin/resources')
    } catch (error) {
      console.error('Save failed:', error)
      alert('Could not save resource. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex items-center justify-center gap-3 text-aurora-primary-dark/60">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-semibold">Loading resource...</span>
      </div>
    )
  }

  if (notFound || !id) {
    return (
      <div className="max-w-3xl mx-auto py-16 card-aurora text-center">
        <p className="text-sm text-aurora-primary-dark/70">Resource not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate('/admin/resources')}
        className="flex items-center gap-2 text-sm font-semibold text-aurora-primary-dark/60 hover:text-aurora-primary-dark transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Resources
      </button>

      <div className="card-aurora p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-aurora-primary-dark">Edit Resource</h2>
          <p className="text-sm text-aurora-primary-dark/60 mt-1">ID: {id}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Title">
            <input
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-aurora-primary-dark/15 bg-white text-sm text-aurora-primary-dark outline-none focus:border-aurora-secondary-blue"
            />
          </Field>

          <Field label="Type">
            <input
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-aurora-primary-dark/15 bg-white text-sm text-aurora-primary-dark outline-none focus:border-aurora-secondary-blue"
            />
          </Field>

          <Field label="Category">
            <input
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-aurora-primary-dark/15 bg-white text-sm text-aurora-primary-dark outline-none focus:border-aurora-secondary-blue"
            />
          </Field>

          <Field label="Duration">
            <input
              value={form.duration}
              onChange={(e) => updateField('duration', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-aurora-primary-dark/15 bg-white text-sm text-aurora-primary-dark outline-none focus:border-aurora-secondary-blue"
            />
          </Field>

          <Field label="Image URL" className="sm:col-span-2">
            <input
              value={form.image}
              onChange={(e) => updateField('image', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-aurora-primary-dark/15 bg-white text-sm text-aurora-primary-dark outline-none focus:border-aurora-secondary-blue"
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => updateField('status', e.target.value as ResourceStatus)}
              className="w-full px-3 py-2 rounded-lg border border-aurora-primary-dark/15 bg-white text-sm text-aurora-primary-dark outline-none focus:border-aurora-secondary-blue"
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </Field>

          <Field label="Description" className="sm:col-span-2">
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-aurora-primary-dark/15 bg-white text-sm text-aurora-primary-dark outline-none focus:border-aurora-secondary-blue"
            />
          </Field>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-aurora flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-bold tracking-wider uppercase text-aurora-primary-dark/50 mb-2">
        {label}
      </span>
      {children}
    </label>
  )
}