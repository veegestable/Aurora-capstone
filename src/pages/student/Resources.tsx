import { useState } from 'react'
import { Search } from 'lucide-react'
import { ResourceCard } from '../../components/student/ResourceCard'
import { BreathingExercise } from '../../components/student/BreathingExercise'

const MOCK_RESOURCES = [
  {
    id: '1', title: '5-Minute Calm', category: 'For Anxiety', duration: '10 min',
    type: 'Meditation', image: 'https://picsum.photos/seed/sunset-ocean/600/260',
  },
  {
    id: '2', title: 'Stress Release Scan', category: 'For Stress', duration: '15 min',
    type: 'Meditation', image: 'https://picsum.photos/seed/blue-mist/600/260',
  },
  {
    id: '3', title: 'Morning Focus', category: 'For Clarity', duration: '5 min',
    type: 'Focus', image: 'https://picsum.photos/seed/pine-forest/600/260',
  },
  {
    id: '4', title: 'Sleep Journey', category: 'For Rest', duration: '30 min',
    type: 'Sleep', image: 'https://picsum.photos/seed/night-stars/600/260',
  },
]

const CATEGORIES = ['All', 'Meditation', 'Focus', 'Sleep']

export default function StudentResources() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeResource, setActiveResource] = useState<typeof MOCK_RESOURCES[0] | null>(null)

  if (activeResource) {
    return <BreathingExercise resource={activeResource} onBack={() => setActiveResource(null)} />
  }

  const filteredResources = activeCategory === 'All'
    ? MOCK_RESOURCES
    : MOCK_RESOURCES.filter(r => r.type === activeCategory)

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-aurora-primary-dark font-heading">
            Aurora Library
          </h2>
          <p className="text-xs font-bold tracking-wide text-aurora-accent-purple">MSU-IIT CCS</p>
        </div>
        <button className="p-1 cursor-pointer hover:opacity-70 transition-opacity" aria-label="Search">
          <Search className="w-5.5 h-5.5 text-aurora-gray-400" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-aurora-gray-200">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`py-2.5 mr-5 text-sm border-b-2 transition-colors cursor-pointer ${
              activeCategory === cat
                ? 'border-aurora-secondary-blue text-aurora-secondary-blue font-bold'
                : 'border-transparent text-aurora-gray-500 hover:text-aurora-primary-dark'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Resource Cards */}
      <div>
        <h3 className="text-lg font-extrabold text-aurora-primary-dark mb-3.5">Curated for You</h3>
        {filteredResources.map(item => (
          <ResourceCard
            key={item.id}
            item={item}
            onStart={() => setActiveResource(item)}
          />
        ))}
      </div>
    </div>
  )
}