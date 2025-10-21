import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { YouTubeAccount, UserPreferences } from '@/types/models'
import type { Quotas, YouTubeChannel } from '@/types/system'
import { systemApi } from '@/lib/api/system'
import { youtubeApi } from '@/lib/api/youtube'

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
  quotas: Quotas
  youtubeAccounts: YouTubeAccount[]
  youtubeChannels: YouTubeChannel[]
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
  fetchAPIKeys: () => Promise<void>
  fetchQuotas: () => Promise<void>
  fetchYouTubeChannels: () => Promise<void>
  setYouTubeChannels: (channels: YouTubeChannel[]) => void
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
      quotas: {},
      youtubeAccounts: [],
      youtubeChannels: [],
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

      fetchAPIKeys: async () => {
        try {
          const data = await systemApi.getAPIKeys()
          // 轉換為 ApiKeyStatus 結構
          set({
            apiKeys: {
              gemini: {
                value: data.gemini || '',
                tested: !!data.gemini,
              },
              stabilityAI: {
                value: data.stabilityAI || '',
                tested: !!data.stabilityAI,
              },
              dId: {
                value: data.dId || '',
                tested: !!data.dId,
              },
            },
          })
        } catch (error) {
          console.error('Failed to fetch API keys', error)
        }
      },

      fetchQuotas: async () => {
        try {
          const data = await systemApi.getQuotas()
          set({ quotas: data })
        } catch (error) {
          console.error('Failed to fetch quotas', error)
        }
      },

      fetchYouTubeChannels: async () => {
        try {
          const channels = await youtubeApi.getChannels()
          set({ youtubeChannels: channels })
        } catch (error) {
          console.error('Failed to fetch YouTube channels', error)
        }
      },

      setYouTubeChannels: (channels) => {
        set({ youtubeChannels: channels })
      },
    }),
    {
      name: 'ytmaker-auth-storage', // localStorage key
      // 持久化所有狀態
    }
  )
)
