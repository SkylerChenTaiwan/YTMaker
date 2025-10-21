import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '@/store/useAuthStore'

describe('useAuthStore', () => {
  beforeEach(() => {
    // 清空 localStorage
    localStorage.clear()
    // 重置 store
    useAuthStore.setState({
      apiKeys: {
        gemini: { value: '', tested: false },
        stabilityAI: { value: '', tested: false },
        dId: { value: '', tested: false },
      },
      youtubeAccounts: [],
      preferences: {
        voice_gender: 'female',
        voice_speed: 1.0,
        default_privacy: 'unlisted',
        keep_intermediate_assets: false,
        notification_enabled: true,
      },
      ui: {
        sidebarCollapsed: false,
        theme: 'light',
      },
    })
  })

  it('測試 4.1: setApiKey 正確儲存 API Key', () => {
    const { result } = renderHook(() => useAuthStore())

    const keys = {
      gemini: 'AIzaSy...',
      stabilityAI: 'sk-...',
      dId: 'did-...',
    }

    act(() => {
      result.current.setApiKey('gemini', keys.gemini, true)
      result.current.setApiKey('stabilityAI', keys.stabilityAI, true)
      result.current.setApiKey('dId', keys.dId, true)
    })

    expect(result.current.apiKeys.gemini.value).toBe('AIzaSy...')
    expect(result.current.apiKeys.gemini.tested).toBe(true)
    expect(result.current.apiKeys.stabilityAI.value).toBe('sk-...')
    expect(result.current.apiKeys.stabilityAI.tested).toBe(true)
    expect(result.current.apiKeys.dId.value).toBe('did-...')
    expect(result.current.apiKeys.dId.tested).toBe(true)
  })

  it('測試 4.2: addYouTubeAccount 新增 YouTube 帳號', () => {
    const { result } = renderHook(() => useAuthStore())

    const account1 = {
      id: 'yt-001',
      channel_name: '測試頻道 1',
      channel_id: 'UC123',
      avatar_url: 'https://...',
      authorized_at: '2025-01-19T10:00:00Z',
    }

    const account2 = {
      id: 'yt-002',
      channel_name: '測試頻道 2',
      channel_id: 'UC456',
      avatar_url: 'https://...',
      authorized_at: '2025-01-19T10:10:00Z',
    }

    act(() => {
      result.current.addYouTubeAccount(account1)
      result.current.addYouTubeAccount(account2)
    })

    expect(result.current.youtubeAccounts).toHaveLength(2)
    expect(result.current.youtubeAccounts[0].channel_name).toBe('測試頻道 1')
    expect(result.current.youtubeAccounts[1].channel_name).toBe('測試頻道 2')
  })

  it('測試 4.3: removeYouTubeAccount 移除 YouTube 帳號', () => {
    const { result } = renderHook(() => useAuthStore())

    const account1 = {
      id: 'yt-001',
      channel_name: '測試頻道 1',
      channel_id: 'UC123',
      avatar_url: 'https://...',
      authorized_at: '2025-01-19T10:00:00Z',
    }

    const account2 = {
      id: 'yt-002',
      channel_name: '測試頻道 2',
      channel_id: 'UC456',
      avatar_url: 'https://...',
      authorized_at: '2025-01-19T10:10:00Z',
    }

    act(() => {
      result.current.addYouTubeAccount(account1)
      result.current.addYouTubeAccount(account2)
    })

    expect(result.current.youtubeAccounts).toHaveLength(2)

    // 移除第一個帳號
    act(() => {
      result.current.removeYouTubeAccount('yt-001')
    })

    expect(result.current.youtubeAccounts).toHaveLength(1)
    expect(result.current.youtubeAccounts[0].id).toBe('yt-002')

    // 移除不存在的帳號不報錯
    act(() => {
      result.current.removeYouTubeAccount('non-existent-id')
    })

    expect(result.current.youtubeAccounts).toHaveLength(1)
  })

  it('測試 4.4: updatePreferences 更新使用者偏好', () => {
    const { result } = renderHook(() => useAuthStore())

    // 初始值
    expect(result.current.preferences.voice_gender).toBe('female')
    expect(result.current.preferences.notification_enabled).toBe(true)

    // 第一次更新
    act(() => {
      result.current.updatePreferences({ voice_gender: 'male' })
    })

    expect(result.current.preferences.voice_gender).toBe('male')
    expect(result.current.preferences.notification_enabled).toBe(true) // 保持

    // 第二次更新
    act(() => {
      result.current.updatePreferences({ notification_enabled: false })
    })

    expect(result.current.preferences.voice_gender).toBe('male') // 保持
    expect(result.current.preferences.notification_enabled).toBe(false)
  })
})
