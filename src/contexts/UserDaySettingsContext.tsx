import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { userSettingsService } from '../services/user-settings'
import type { UserSettingsDoc } from '../types/user-settings.types'

interface UserDaySettingsContextValue {
  settings: UserSettingsDoc | null;
  isLoading: boolean;
  updateSettings: (updates: Partial<UserSettingsDoc>) => Promise<void>;
}

const UserDaySettingsContext = createContext<UserDaySettingsContextValue | undefined>(undefined)

export function UserDaySettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettingsDoc | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const loadSettings = async () => {
      if (!user?.id || user.role !== 'student') {
        if (mounted) {
          setSettings(null)
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      try {
        const data = await userSettingsService.getUserSettings(user.id)
        if (mounted) setSettings(data)
      } catch (err) {
        console.error('Failed to load user settings', err)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadSettings()
    return () => { mounted = false }
  }, [user?.id, user?.role])

  const updateSettings = async (updates: Partial<UserSettingsDoc>) => {
    if (!user?.id) return
    await userSettingsService.updateUserSettings(user.id, updates)
    setSettings((prev) => ({ ...prev, ...updates }))
  }

  return (
    <UserDaySettingsContext.Provider value={{ settings, isLoading, updateSettings }}>
      {children}
    </UserDaySettingsContext.Provider>
  )
}

export function useUserDaySettings() {
  const context = useContext(UserDaySettingsContext)
  if (context === undefined) {
    throw new Error('useUserDaySettings must be used within a UserDaySettingsProvider')
  }
  return context
}