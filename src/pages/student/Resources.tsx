import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ResourceCard } from '../../components/student/ResourceCard'
import { BreathingExercise } from '../../components/student/BreathingExercise'
import { resourcesService } from '../../services/resources'
import type { ResourceItem } from '../../types/resource.types'

const CATEGORIES = ['All', 'Meditation', 'Focus', 'Sleep', 'Article'] as const

export default function StudentResources() {
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>('All')
  const [activeResource, setActiveResource] = useState<ResourceItem | null>(null)
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const rows = await resourcesService.listResources('published')
        if (!cancelled) setResources(rows)
      } catch (e) {
        console.error('Failed to load resources:', e)
        if (!cancelled) setResources([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (activeResource) {
    return <BreathingExercise resource={activeResource} onBack={() => setActiveResource(null)} />
  }

  const filteredResources = useMemo(() => {
    let list = activeCategory === 'All'
      ? resources
      : resources.filter((r) => r.type === activeCategory)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
      )
    }

    return list
  }, [resources, activeCategory, search])

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-aurora-primary-dark font-heading">
            Aurora Library
          </h2>
          <p className="text-xs font-bold tracking-wide text-aurora-accent-purple">MSU-IIT CCS</p>
        </div>
        <div className="p-1" aria-hidden>
          <Search className="w-5.5 h-5.5 text-aurora-gray-400" />
        </div>
      </div>

      <div className="flex items-center gap-2.5 card-aurora rounded-full! py-2.5! px-4!">
        <Search className="w-[18px] h-[18px] text-aurora-primary-dark/40 shrink-0" />
        <input
          type="text"
          placeholder="Search resources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-aurora-primary-dark placeholder:text-aurora-primary-dark/40 outline-none"
        />
      </div>

      <div className="flex border-b border-aurora-gray-200 mb-6 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`py-2.5 mr-5 text-sm border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeCategory === cat
                ? 'border-aurora-secondary-blue text-aurora-secondary-blue font-bold'
                : 'border-transparent text-aurora-gray-500 hover:text-aurora-primary-dark'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-extrabold text-aurora-primary-dark mb-3.5">Curated for You</h3>

        {loading ? (
          <p className="text-sm text-aurora-primary-dark/50">Loading resources...</p>
        ) : filteredResources.length === 0 ? (
          <p className="text-sm text-aurora-primary-dark/50">No resources found.</p>
        ) : (
          filteredResources.map((item) => (
            <ResourceCard
              key={item.id}
              item={item}
              onStart={() => setActiveResource(item)}
            />
          ))
        )}
      </div>
    </div>
  )
}