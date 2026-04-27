import { useState } from 'react'
import { Shield, Bell, Sliders, Save, AlertTriangle } from 'lucide-react'

export default function AdminSettings() {
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    nlpThreshold: 0.85,
    lowMoodDays: 3,
    emailAlerts: true,
    dailyReports: true,
    allowOverride: true,
    maintenanceMode: false
  })

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 800) // mock save delay
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-aurora-primary-dark">Platform Settings</h1>
          <p className="text-sm text-aurora-gray-500 mt-1">Configure risk thresholds, alert rules, and platform preferences.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-aurora-secondary-blue hover:bg-aurora-secondary-dark-blue text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-70 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Thresholds */}
        <div className="bg-white rounded-2xl p-6 border border-aurora-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="font-bold text-aurora-primary-dark">Risk Thresholds</h2>
              <p className="text-xs text-aurora-gray-500">Triggers for automatic counselor alerts</p>
            </div>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-aurora-primary-dark mb-2">
                <span>NLP Risk Score Threshold</span>
                <span className="text-aurora-secondary-blue font-bold">{settings.nlpThreshold.toFixed(2)}</span>
              </label>
              <input 
                type="range" min="0" max="1" step="0.05"
                value={settings.nlpThreshold}
                onChange={e => setSettings({...settings, nlpThreshold: parseFloat(e.target.value)})}
                className="w-full accent-aurora-secondary-blue cursor-pointer"
              />
              <p className="text-xs text-aurora-gray-500 mt-1">Flag journal entries with a negative sentiment score above this value.</p>
            </div>

            <div className="pt-3">
              <label className="block text-sm font-semibold text-aurora-primary-dark mb-2">Consecutive Low Moods</label>
              <select 
                value={settings.lowMoodDays}
                onChange={e => setSettings({...settings, lowMoodDays: parseInt(e.target.value)})}
                className="w-full bg-aurora-gray-50 border border-aurora-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-aurora-primary-dark focus:outline-none focus:border-aurora-secondary-blue cursor-pointer"
              >
                <option value={2}>2 Days in a row</option>
                <option value={3}>3 Days in a row</option>
                <option value={4}>4 Days in a row</option>
                <option value={5}>5 Days in a row</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alert Rules */}
        <div className="bg-white rounded-2xl p-6 border border-aurora-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-aurora-secondary-blue" />
            </div>
            <div>
              <h2 className="font-bold text-aurora-primary-dark">Alert Rules</h2>
              <p className="text-xs text-aurora-gray-500">Notification preferences for staff</p>
            </div>
          </div>

          <div className="space-y-5">
            <label className="flex items-center justify-between cursor-pointer p-3 -mx-3 hover:bg-aurora-gray-50 rounded-xl transition-colors">
              <div>
                <p className="text-sm font-semibold text-aurora-primary-dark">Email High Risk Alerts</p>
                <p className="text-xs text-aurora-gray-500 mt-0.5">Immediately email counselors when a student is flagged</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.emailAlerts}
                onChange={e => setSettings({...settings, emailAlerts: e.target.checked})}
                className="w-5 h-5 rounded border-aurora-gray-300 text-aurora-secondary-blue focus:ring-aurora-secondary-blue cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-3 -mx-3 hover:bg-aurora-gray-50 rounded-xl transition-colors">
              <div>
                <p className="text-sm font-semibold text-aurora-primary-dark">Daily Summary Reports</p>
                <p className="text-xs text-aurora-gray-500 mt-0.5">Send a digest of all activities at 8:00 AM</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.dailyReports}
                onChange={e => setSettings({...settings, dailyReports: e.target.checked})}
                className="w-5 h-5 rounded border-aurora-gray-300 text-aurora-secondary-blue focus:ring-aurora-secondary-blue cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Platform Preferences */}
        <div className="bg-white rounded-2xl p-6 border border-aurora-gray-200 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5 text-aurora-accent-purple" />
            </div>
            <div>
              <h2 className="font-bold text-aurora-primary-dark">Platform Preferences</h2>
              <p className="text-xs text-aurora-gray-500">Global application behavior</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl border border-aurora-gray-100 hover:bg-aurora-gray-50 transition-colors">
              <div>
                <p className="text-sm font-semibold text-aurora-primary-dark">Counselor Override</p>
                <p className="text-xs text-aurora-gray-500 mt-0.5">Allow manual removal of risk flags</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.allowOverride}
                onChange={e => setSettings({...settings, allowOverride: e.target.checked})}
                className="w-5 h-5 rounded border-aurora-gray-300 text-aurora-accent-purple focus:ring-aurora-accent-purple cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl border border-red-100 hover:bg-red-50/50 transition-colors">
              <div>
                <p className="text-sm font-semibold text-aurora-primary-dark flex items-center gap-2">
                  Maintenance Mode
                  {settings.maintenanceMode && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                </p>
                <p className="text-xs text-aurora-gray-500 mt-0.5">Prevent student logins (Admin access only)</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.maintenanceMode}
                onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})}
                className="w-5 h-5 rounded border-red-300 text-red-500 focus:ring-red-500 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}