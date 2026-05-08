import { useEffect, useState } from 'react'
import { BarChart, TrendingUp, Users, Activity, Battery, Sliders } from 'lucide-react'
import { adminService } from '../../services/admin'
import type { SchoolAnalytics, ThresholdSnapshot } from '../../services/admin'

function StatTile({
  label,
  value,
  subtext,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  subtext: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
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
  const [analytics, setAnalytics] = useState<SchoolAnalytics | null>(null)
  const [thresholds, setThresholds] = useState<ThresholdSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [a, t] = await Promise.all([
          adminService.getSchoolAnalytics(),
          adminService.getThresholdSnapshot(),
        ])
        if (!cancelled) {
          setAnalytics(a)
          setThresholds(t)
        }
      } catch (e) {
        console.error('Failed to load analytics:', e)
        if (!cancelled) {
          setAnalytics({
            activeStudents: 0,
            avgStress: 0,
            avgEnergy: 0,
            totalCheckIns30d: 0,
            totalCheckInsAllTime: 0,
          })
          setThresholds({
            nlpThreshold: 0.85,
            lowMoodDays: 3,
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

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

      {loading ? (
        <div className="card-aurora p-6 text-sm text-aurora-primary-dark/50">Loading analytics...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatTile
              label="Active Students"
              value={String(analytics?.activeStudents ?? 0)}
              subtext="Current student accounts"
              icon={Users}
              color="bg-aurora-secondary-blue"
            />
            <StatTile
              label="Avg Stress Level (30d)"
              value={`${(analytics?.avgStress ?? 0).toFixed(1)} / 5`}
              subtext="Based on last 30 days mood entries"
              icon={Activity}
              color="bg-orange-500"
            />
            <StatTile
              label="Avg Energy Level (30d)"
              value={`${(analytics?.avgEnergy ?? 0).toFixed(1)} / 5`}
              subtext="Based on last 30 days mood entries"
              icon={Battery}
              color="bg-aurora-accent-purple"
            />
            <StatTile
              label="Check-ins (30d / All time)"
              value={`${analytics?.totalCheckIns30d ?? 0} / ${analytics?.totalCheckInsAllTime ?? 0}`}
              subtext="Collection-group count of mood entries"
              icon={TrendingUp}
              color="bg-green-500"
            />
          </div>

          <div className="card-aurora p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-aurora-secondary-blue/15">
                <Sliders className="w-5 h-5 text-aurora-secondary-blue" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-aurora-primary-dark">Threshold Snapshot</h3>
                <p className="text-sm text-aurora-primary-dark/60 mt-1">
                  Read from `adminSettings/default` with safe fallback defaults.
                </p>
                <div className="mt-3 text-sm text-aurora-primary-dark/80 space-y-1">
                  <p><span className="font-semibold">NLP risk threshold:</span> {thresholds?.nlpThreshold.toFixed(2)}</p>
                  <p><span className="font-semibold">Consecutive low mood days:</span> {thresholds?.lowMoodDays}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card-aurora p-6 min-h-[220px] flex flex-col items-center justify-center text-center">
            <BarChart className="w-14 h-14 text-aurora-primary-dark/10 mb-4" />
            <h3 className="text-lg font-bold text-aurora-primary-dark">Charts Ready For Next Pass</h3>
            <p className="text-sm text-aurora-primary-dark/50 max-w-md mt-2">
              Tile metrics are now data-backed. Add trend charts once you decide on the charting component and index strategy.
            </p>
          </div>
        </>
      )}
    </div>
  )
}