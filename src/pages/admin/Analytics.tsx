import { BarChart, TrendingUp, Users, Activity, Battery } from 'lucide-react'

function StatTile({ label, value, subtext, icon: Icon, color }: any) {
  return (
    <div className="card-aurora p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-aurora-primary-dark/50 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-extrabold text-aurora-primary-dark">{value}</p>
        <p className="text-xs text-aurora-primary-dark/40 mt-1">{subtext}</p>
      </div>
    </div>
  )
}

export default function AdminAnalytics() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] text-aurora-primary-dark/40 uppercase">Admin</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-aurora-primary-dark font-heading mt-1">
            School Analytics
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatTile 
          label="Active Students" 
          value="1,248" 
          subtext="+12% from last month"
          icon={Users}
          color="bg-aurora-secondary-blue"
        />
        <StatTile 
          label="Avg Stress Level" 
          value="3.2 / 5" 
          subtext="Moderate baseline"
          icon={Activity}
          color="bg-orange-500"
        />
        <StatTile 
          label="Avg Energy Level" 
          value="2.8 / 5" 
          subtext="Slightly depleted"
          icon={Battery}
          color="bg-aurora-accent-purple"
        />
        <StatTile 
          label="Total Check-ins" 
          value="15.2k" 
          subtext="This semester"
          icon={TrendingUp}
          color="bg-green-500"
        />
      </div>

      <div className="card-aurora p-6 min-h-[300px] flex flex-col items-center justify-center text-center">
        <BarChart className="w-16 h-16 text-aurora-primary-dark/10 mb-4" />
        <h3 className="text-lg font-bold text-aurora-primary-dark">Detailed Charts Coming Soon</h3>
        <p className="text-sm text-aurora-primary-dark/50 max-w-sm mt-2">
          The full analytics dashboard with longitudinal mood tracking and departmental breakdowns will be available in Batch 2.
        </p>
      </div>
    </div>
  )
}