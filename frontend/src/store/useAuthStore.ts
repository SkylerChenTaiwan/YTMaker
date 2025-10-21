import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { YouTubeAccount, UserPreferences } from '@/types/models'

interface ApiKeyStatus {
  value: string
  tested: boolean
}

interface YouTubeAuth {
  connected: boolean
  channel_name: string
  channel_id: string
  thumbnail_url: string
}

interface AuthState {
  apiKeys: {
    gemini: ApiKeyStatus
    stabilityAI: ApiKeyStatus
    dId: ApiKeyStatus
  }
  youtube: YouTubeAuth
  youtubeAccounts: YouTubeAccount[]
  preferences: UserPreferences
  ui: {
    sidebarCollapsed: boolean
    theme: 'light' | 'dark'
  }
}

interface AuthActions {
  setApiKey: (
    service: 'gemini' | 'stabilityAI' | 'dId',
    key: string,
    tested?: boolean
  ) => void
  setYouTubeAuth: (auth: Partial<YouTubeAuth>) => void
  clearAuth: () => void
  addYouTubeAccount: (account: YouTubeAccount) => void
  removeYouTubeAccount: (accountId: string) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

const defaultPreferences: UserPreferences = {
  voice_gender: 'female',
  voice_speed: 1.0,
  default_privacy: 'unlisted',
  keep_intermediate_assets: false,
  notification_enabled: true,
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      // ========== State ==========
      apiKeys: {
        gemini: { value: '', tested: false },
        stabilityAI: { value: '', tested: false },
        dId: { value: '', tested: false },
      },
      youtube: {
        connected: false,
        channel_name: '',
        channel_id: '',
        thumbnail_url: '',
      },
      youtubeAccounts: [],
      preferences: defaultPreferences,
      ui: {
        sidebarCollapsed: false,
        theme: 'light',
      },

      // ========== Actions ==========
      setApiKey: (service, key, tested = true) => {
        set((state) => ({
          apiKeys: {
            ...state.apiKeys,
            [service]: { value: key, tested },
          },
        }))
      },

      setYouTubeAuth: (auth) => {
        set((state) => ({
          youtube: { ...state.youtube, ...auth },
        }))
      },

      clearAuth: () => {
        set({
          apiKeys: {
            gemini: { value: '', tested: false },
            stabilityAI: { value: '', tested: false },
            dId: { value: '', tested: false },
          },
          youtube: {
            connected: false,
            channel_name: '',
            channel_id: '',
            thumbnail_url: '',
          },
        })
      },

      addYouTubeAccount: (account) => {
        set((state) => ({
          youtubeAccounts: [...state.youtubeAccounts, account],
        }))
      },

      removeYouTubeAccount: (accountId) => {
        set((state) => ({
          youtubeAccounts: state.youtubeAccounts.filter(
            (acc) => acc.id !== accountId
          ),
        }))
      },

      updatePreferences: (preferences) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...preferences,
          },
        }))
      },

      toggleSidebar: () => {
        set((state) => ({
          ui: {
            ...state.ui,
            sidebarCollapsed: !state.ui.sidebarCollapsed,
          },
        }))
      },

      setTheme: (theme) => {
        set((state) => ({
          ui: {
            ...state.ui,
            theme,
          },
        }))
      },
    }),
    {
      name: 'ytmaker-auth-storage', // localStorage key
      // 持久化所有狀態
    }
  )
)
