import MockAdapter from 'axios-mock-adapter'
import apiClient from '@/services/api'
import * as youtubeApi from '@/services/youtubeApi'

const mock = new MockAdapter(apiClient)

describe('YouTube API', () => {
  afterEach(() => {
    mock.reset()
  })

  describe('getAuthUrl', () => {
    it('should get YouTube auth URL', async () => {
      mock.onGet('/youtube/auth-url').reply(200, {
        auth_url: 'https://accounts.google.com/o/oauth2/v2/auth?...',
      })

      const result = await youtubeApi.getAuthUrl()

      expect(result.auth_url).toContain('https://accounts.google.com')
    })
  })

  describe('getChannels', () => {
    it('should get YouTube channels', async () => {
      const mockChannels = [
        {
          id: 'channel-1',
          name: 'My Channel',
          avatar_url: 'https://example.com/avatar.jpg',
          subscriber_count: 1000,
          authorized_at: '2025-10-19',
        },
      ]

      mock.onGet('/youtube/channels').reply(200, mockChannels)

      const result = await youtubeApi.getChannels()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('My Channel')
    })
  })

  describe('handleCallback', () => {
    it('should handle OAuth callback', async () => {
      const mockChannel = {
        id: 'channel-1',
        name: 'My Channel',
        avatar_url: 'https://example.com/avatar.jpg',
        subscriber_count: 1000,
        authorized_at: '2025-10-19',
      }

      mock.onPost('/youtube/callback').reply(200, mockChannel)

      const result = await youtubeApi.handleCallback('auth-code-123')

      expect(result.name).toBe('My Channel')
    })
  })

  describe('removeChannel', () => {
    it('should remove YouTube channel', async () => {
      mock.onDelete('/youtube/channels/channel-1').reply(204)

      await youtubeApi.removeChannel('channel-1')

      expect(mock.history.delete.length).toBe(1)
    })
  })
})
