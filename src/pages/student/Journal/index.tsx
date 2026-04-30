import { useState } from 'react'
import { JournalCalendar } from '../../../components/journal/JournalCalendar'
import { AnalyticsTab } from '../../../components/journal/AnalyticsTab'
import { Book, BarChart3 } from 'lucide-react'

export default function Journal() {
  const [activeTab, setActiveTab] = useState<'journal' | 'analytics'>('journal')

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white font-heading">
          My Journal
        </h2>
        <p className="text-aurora-text-muted text-sm">
          Track your moods, analyze patterns, and view your emotional history.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-aurora-bg/50 p-1.5 rounded-xl border border-white/5 w-fit">
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'journal'
              ? 'bg-aurora-blue text-white shadow-md'
              : 'text-aurora-text-sec hover:text-white cursor-pointer hover:bg-white/5'
          }`}
        >
          <Book className="w-4 h-4" />
          Journal
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'analytics'
              ? 'bg-aurora-purple text-white shadow-md'
              : 'text-aurora-text-sec hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'journal' ? <JournalCalendar /> : <AnalyticsTab />}
      </div>
    </div>
  )
}