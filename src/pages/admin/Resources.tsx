import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, PlayCircle, BookOpen, Clock, FileText } from 'lucide-react'
import { resourcesService } from '../../services/resources'
import type { ResourceItem } from '../../types/resource.types'

export default function AdminResources() {
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [loading, setLoading] = useState(true)

  const loadResources = async () => {
    setLoading(true)
    try {
      const rows = await resourcesService.listResources()
      setResources(rows)
    } catch (e) {
      console.error('Failed to load admin resources:', e)
      setResources([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadResources()
  }, [])

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filter === 'all' ? true : r.status === filter
      return matchesSearch && matchesFilter
    })
  }, [resources, searchQuery, filter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-primary-dark/40 uppercase">Admin</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading mt-1">
            Resource Library
          </h2>
        </div>
        <button
          onClick={() => alert('Add Resource form is next parity step.')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-aurora-secondary-blue hover:bg-aurora-secondary-dark-blue rounded-xl shadow-aurora transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Resource</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex items-center gap-2.5 card-aurora rounded-full! py-2.5! px-4!">
          <Search className="w-[18px] h-[18px] text-aurora-primary-dark/40 shrink-0" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-aurora-primary-dark placeholder:text-aurora-primary-dark/40 outline-none"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          {(['all', 'published', 'draft'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                filter === key
                  ? 'bg-aurora-primary-dark/10 text-aurora-primary-dark'
                  : 'bg-transparent text-aurora-primary-dark/50 hover:bg-aurora-primary-dark/5'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card-aurora py-12 text-center text-aurora-primary-dark/50 text-sm">Loading resources...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div key={r.id} className="card-aurora overflow-hidden flex flex-col p-0!">
              <div className="h-32 relative">
                <img src={r.image} alt={r.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-linear-to-t from-[#0B0D30] to-transparent opacity-60" />
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                    r.status === 'published' ? 'bg-green-500/80 text-white' : 'bg-amber-500/80 text-white'
                  }`}>
                    {r.status}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-md">
                  <Clock className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-bold text-white">{r.duration}</span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center gap-1.5 mb-1.5 text-aurora-primary-dark/60">
                  {r.type === 'Article' ? <FileText className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                  <span className="text-[11px] font-bold uppercase tracking-wider">{r.type}</span>
                  <span className="text-[11px] px-1">•</span>
                  <span className="text-[11px] font-bold">{r.category}</span>
                </div>

                <h3 className="text-base font-extrabold text-aurora-primary-dark mb-4">{r.title}</h3>

                <div className="mt-auto flex items-center gap-2">
                  <button
                    className="flex-1 py-2 text-xs font-semibold rounded-lg bg-aurora-primary-dark/5 text-aurora-primary-dark/80 hover:bg-aurora-primary-dark/10 transition-colors cursor-pointer"
                    onClick={() => alert(`Edit ${r.title} form is next parity step.`)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-2 text-xs font-semibold rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                    onClick={async () => {
                      await resourcesService.deleteResource(r.id)
                      await loadResources()
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 card-aurora">
          <BookOpen className="w-12 h-12 text-aurora-primary-dark/20 mx-auto mb-3" />
          <p className="text-aurora-primary-dark/50 text-sm">
            {searchQuery ? 'No resources match your search.' : `No ${filter} resources found.`}
          </p>
        </div>
      )}
    </div>
  )
}