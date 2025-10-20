import MockAdapter from 'axios-mock-adapter'
import apiClient from '@/services/api'
import * as projectsApi from '@/services/projectsApi'

const mock = new MockAdapter(apiClient)

describe('Projects API', () => {
  afterEach(() => {
    mock.reset()
  })

  describe('createProject', () => {
    it('should create project with correct data', async () => {
      const projectData = {
        projectName: 'Test Project',
        contentText: '測試內容'.repeat(100),
        contentSource: 'paste' as const,
      }

      mock.onPost('/projects').reply(201, {
        id: 'proj-123',
        project_name: 'Test Project',
        status: 'INITIALIZED',
        content_text: projectData.contentText,
        content_source: 'paste',
        created_at: '2025-10-19T10:00:00Z',
        updated_at: '2025-10-19T10:00:00Z',
      })

      const result = await projectsApi.createProject(projectData)

      expect(result.id).toBe('proj-123')
      expect(result.project_name).toBe('Test Project')
      expect(result.status).toBe('INITIALIZED')
    })
  })

  describe('getProjects', () => {
    it('should fetch projects list', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          project_name: 'Project 1',
          status: 'COMPLETED',
          content_text: 'test',
          content_source: 'paste',
          created_at: '2025-10-18T10:00:00Z',
          updated_at: '2025-10-18T10:00:00Z',
        },
        {
          id: 'proj-2',
          project_name: 'Project 2',
          status: 'RENDERING',
          content_text: 'test',
          content_source: 'paste',
          created_at: '2025-10-19T10:00:00Z',
          updated_at: '2025-10-19T10:00:00Z',
        },
      ]

      mock.onGet('/projects').reply(200, mockProjects)

      const result = await projectsApi.getProjects()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('proj-1')
    })
  })

  describe('getProject', () => {
    it('should fetch single project', async () => {
      const mockProject = {
        id: 'proj-123',
        project_name: 'Test Project',
        status: 'INITIALIZED',
        content_text: 'test',
        content_source: 'paste',
        created_at: '2025-10-19T10:00:00Z',
        updated_at: '2025-10-19T10:00:00Z',
      }

      mock.onGet('/projects/proj-123').reply(200, mockProject)

      const result = await projectsApi.getProject('proj-123')

      expect(result.id).toBe('proj-123')
      expect(result.project_name).toBe('Test Project')
    })
  })

  describe('deleteProject', () => {
    it('should delete project', async () => {
      mock.onDelete('/projects/proj-123').reply(204)

      await projectsApi.deleteProject('proj-123')

      expect(mock.history.delete.length).toBe(1)
      expect(mock.history.delete[0].url).toBe('/projects/proj-123')
    })
  })

  describe('updateProject', () => {
    it('should update project', async () => {
      const updateData = {
        project_name: 'Updated Project',
      }

      mock.onPut('/projects/proj-123').reply(200, {
        id: 'proj-123',
        project_name: 'Updated Project',
        status: 'INITIALIZED',
        content_text: 'test',
        content_source: 'paste',
        created_at: '2025-10-19',
        updated_at: '2025-10-19',
      })

      const result = await projectsApi.updateProject('proj-123', updateData)

      expect(result.project_name).toBe('Updated Project')
    })
  })

  describe('startGeneration', () => {
    it('should start generation', async () => {
      mock.onPost('/projects/proj-123/generate').reply(200)

      await projectsApi.startGeneration('proj-123')

      expect(mock.history.post.length).toBe(1)
    })
  })

  describe('getProgress', () => {
    it('should get project progress', async () => {
      const mockProgress = {
        stage: 'RENDERING',
        percentage: 50,
      }

      mock.onGet('/projects/proj-123/progress').reply(200, mockProgress)

      const result = await projectsApi.getProgress('proj-123')

      expect(result.percentage).toBe(50)
    })
  })

  describe('pauseGeneration', () => {
    it('should pause generation', async () => {
      mock.onPost('/projects/proj-123/pause').reply(200)

      await projectsApi.pauseGeneration('proj-123')

      expect(mock.history.post.length).toBe(1)
    })
  })

  describe('resumeGeneration', () => {
    it('should resume generation', async () => {
      mock.onPost('/projects/proj-123/resume').reply(200)

      await projectsApi.resumeGeneration('proj-123')

      expect(mock.history.post.length).toBe(1)
    })
  })

  describe('cancelGeneration', () => {
    it('should cancel generation', async () => {
      mock.onPost('/projects/proj-123/cancel').reply(200)

      await projectsApi.cancelGeneration('proj-123')

      expect(mock.history.post.length).toBe(1)
    })
  })

  describe('getResult', () => {
    it('should get project result', async () => {
      const mockResult = {
        video_url: 'https://example.com/video.mp4',
      }

      mock.onGet('/projects/proj-123/result').reply(200, mockResult)

      const result = await projectsApi.getResult('proj-123')

      expect(result.video_url).toBe('https://example.com/video.mp4')
    })
  })

  describe('retryProject', () => {
    it('should retry project', async () => {
      mock.onPost('/projects/proj-123/retry').reply(200)

      await projectsApi.retryProject('proj-123')

      expect(mock.history.post.length).toBe(1)
    })
  })
})
